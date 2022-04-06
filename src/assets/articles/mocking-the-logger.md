Services depend on logger instances really often. When these services are under testing, the logger dependency is preferably a mocked logger instance.  
As for any other service dependency, we don’t really take in account what the logger is actually doing, when it comes to testing; we only care about fulfilling the service dependency to make the test run and focus on what the actual service under test does.

> As usual, we are going to ignore how the logger behaves: how the log event is formatted, what the log event target is (file, console, UDP, [Seq][1], …), which log levels are enabled and so on. These *settings* will be normally defined at runtime. Unit testing is far beyond those details.

I personally **always** use the Microsoft `ILogger` abstraction; which I think it’s the proper decision to make. As the most common logging interface, any component can be abstracted of how the system’s logging is implemented.  
The logging engine is not something you would be changing that often. However, it is too widely used that changing it can turn into a huge pain in the ass. Just spend five minutes in abstracting your logging implementation ([Serilog][2], [log4net][3], [NLog][4], …) to the Microsoft `ILogger` interface.

Mocking an `ILogger` instance is pretty easy using any modern library such as [Moq][5], [NSubstitute][6] or [FakeItEasy][7] – just like any other interface.  
As an example, mocking a logger instance using the latter would be as easy as so

```csharp
var logger = A.Fake<ILogger>();
var genericLogger = A.Fake<ILogger<MyService>>();

var sut = new MyService(logger, genericLogger);
```

However, as it usually happens with mocking, the mocked logger instance methods will do nothing. Sometimes, it’s very useful to see what’s going on inside the service under test when invoking its methods. Being able to read the log events could make checking the service’s guts easier.

If you use [xUnit][8], lucky you! This library provides the `ITestOutputHelper` abstraction, which using it makes printing to the output display a trivial task.

```csharp
public class MyTestsSuite
{
    private readonly ITestOutputHelper _testOutputHelper;
    
    public MyTestsSuite(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
    }
    
    [Fact]
    public void Test1()
    {
        _testOutputHelper.WriteLine("Executing test {Test}", nameof(Test1));
        // ..
    }
}
```

I guess you already know where I am heading… Wouldn’t it be cool to make our mocked `ILogger` instances to use the `ITestOutputHelper` interface to print their log events to the tests display output?

### Presenting Mogger

> Mocking + `ILooger` = `Mogger`

Well, among other features, [Mogger][9] does exactly that: it creates mocked `ILogger` instances that can actually print log events to the display output.

```csharp
using Mogger;
using Xunit;
using Xunit.Abstractions;

public class MyTestsSuite
{
    private readonly ITestOutputHelper _testOutputHelper;
    
    public MyTestsSuite(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
    }
    
    private ILogger FakeLogger => Mogger.Create(_testOutputHelper);
    private ILogger<MyService> FakeGenericLogger => Mogger<MyService>.Create(_testOutputHelper);
    
    [Fact]
    public void Test1()
    {
        var sut = new MyService(FakeLogger, FakeGenericLogger);
        sut.DoWork();
        // ..
    }
}
```

> Log events are printed in the tests display output, following the output template below.  
> `{Date:HH:mm:ss.fff} {Level, -5} [{ThreadId, -4}]: {Message}`  
> `{Exception.Type}: {Exception.Message}`  
> `{Exception.StackTrace}`
>
> Assuming this `MyService` implementation,
>
> ```csharp
> public class MyService
> {
>     private readonly ILogger _logger;
>     private readonly ILogger<MyService> _genericLogger;
> 
>     public MyService(ILogger logger, ILogger<MyService> genericLogger)
>     {
>         _logger = logger;
>         _genericLogger = genericLogger;
>     }
> 
>     public void DoWork()
>     {
>         _logger.LogInformation("Super important information");
>         _logger.LogWarning("Super important warning message");
> 
>         try
>         {
>             Crash();
>         }
>         catch (Exception ex)
>         {
>             _logger.LogError(ex, "Super important error")   
>         }
>     }
> 
>     private static void Crash() =>
>         throw new ArgumentException("Something happened");
> }
> ```
>
> … the `Test1` execution output will be
>
> ```
> 20:30:17.123 INFO  [16  ]: Super important information
> 20:30:17.125 WARN  [16  ]: Super important warning message
> 20:30:17.232 ERROR [16  ]: Super important error
> ArgumentException: Something happened
>    at Example.Logging.Testing.MyService.Crash()
>    at Example.Logging.Testing.MyService.DoWork()
> ```

The `Create` method returns an `IMogger` instance (or `IMogger<>`, in case of the `IMogger<>.Create` method), which has an `ILogger` property called `Proxied`. The `Proxied` property returns the actual mocked logger instance, which can be customized, if necessary.

> The `LogInformation`, `LogWarning` , […] methods cannot be mocked (at least with *FakeItEasy*) because they are static extension methods of the `ILogger` interface. Trying to intercept them will cause an exception  
> `FakeItEasy.Configuration.FakeConfigurationException:`  
> `The current proxy generator can not intercept the specified method for the following reason:`  
> `- Extension methods can not be intercepted since they're static`.

#### The implementation

Most of that text above can be read in the library documentation – either in the NuGet page or in the [GitHub repository page][14]. I wasn’t sure about spending a couple of minutes showing the actual implementation of that, mostly because I think it is somehow disappointing. There’s nothing much to show, since the feature is so trivial that I cannot exploit it further…

Anyhow, the library is open source; so, why not?  
I will use the opportunity to explain anything worth to mention (and not obvious) directly in the code.

```csharp
public class Mogger : IMogger
{
    private readonly ITestOutputHelper _testOutputHelper;
    
    // The constructor is hidden from the outside to force
    // consumers to create Mogger instances with the factory method.
    // It is protected because the generic child class uses it.
    //
    // public class Mogger<T> : Mogger, IMogger<T>
    // {
    //     private Mogger(ITestOutputHelper testOutputHelper)
    //         : base(testOutputHelper)
    //     {
    //     }
    //
    //     public static new IMogger<T> Create(ITestOutputHelper testOutputHelper)
    //     {
    //         return new Mogger<T>(testOutputHelper);
    //     }
    // }
    protected Mogger(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        Proxied = A.Fake<ILogger>();
    }
    
    public ILogger Proxied { get; }
    
    private int ThreadId => Environment.CurrentManagedThreadId;
    private DateTime Now => DateTime.Now;
    
    // I implement a static factory method, in case I want to
    // add new features in the future that require any constructor
    // modification.
    // Having a factory method makes my API more reliable.
    // The creation of instances with new features can be added overloading
    // the Create method, which avoids breaking changes.
    // Of course, I could overload the constructor, but it feels cleaner and
    // more natural (and intuitive) as factory methods, to me.
    // Moreover, I could add new classes that implement the IMogger interface
    // and use the Mogger.Create set of methods to instantiate them, having
    // a single source of instances.
    public static IMogger Create(ITestOutputHelper testOutputHelper)
    {
        return new Mogger(testOutputHelper);
    }
    
    // These two methods don't have anything special.
    // I think they don't add any value for our testing scope.
    public IDisposable BeginScope<TState>(TState state) => Proxied.BeginScope(state);
    public bool IsEnabled(LogLevel logLevel) => Proxied.IsEnabled(logLevel);
    
    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        // The formatter is not going to be implemented,
        // Because this is using the default formatter (of the LoggerExtensions class)
        // which returns state.ToString();
        var message = formatter(state, exception);
        var lvl = logLevel switch
        {
            LogLevel.Trace => "TRACE",
            LogLevel.Debug => "DEBUG",
            // ...
            _ => string.Empty
        };
        
        var formattedException = FormatException(exception);
        var preffix = $"{Now:HH:mm:ss.fff} {lvl, -5} [{ThreadId, -4}]: ";
        var logMessage = "{message}{formattedException}";
        
        // Printing the message.
        _testOutputHelper.WriteLine($"{preffix}{logMessage}");
        
        // Propagating the Log method invocation to the proxied logger
        // is very important to make assertions on those invocations.
        Proxied.Log(logLevel, eventId, state, exception, formatter);
    }
    
    private static string FormatException(Exception? ex)
    {
        // Since the formatter doesn't take the exception in account,
        // it has to be included -- and formatted -- in case of not being null
        
        // If the exception is null, this string will be "\n\n".
        // Trimming the end returns an empty string.
        // Trimming the entire string (beggining and ending) would
        // remove the first new line character, even when the exception
        // is not null.
        return
            $"\n{ex?.GetType().Name}: {ex?.Message}" +
            $"\n{ex?.StackTrace}"
            .TrimEnd('\n');
    }
}
```

In case you were wondering, [here][11]’s the default formatter implementation in the `LoggerExtensions` static class. Thanks Microsoft for sharing knowledge along the globe.

#### Logging assertions

This is an opinionated topic.

Are logging statements meant to be tested? No, mainly. They don’t tend to be part of the business layer of a service, they are part of the use cases (barely). Testing a service by its logging usage is not healthy – I don’t recommend it, at least. Log events come and go, the logging message content or the log level should be able to mutate without any worries.  
Logging assertions are niche situations, but they deserve some attention for those situations where needed.

I would like to present a situation where I had to use logging assertions recently. In my case, the logging was part of the business of the service I wanted to test.

##### The niche situation why I implemented Mogger

Back in time, I was implementing a part of an enterprise application where I wanted to have configurable behavior – executable code that is implemented by configuration. [Jint][10] was my friendly ally to allow the user to write JavaScript code that would be executed at some point.  
*Jint* is a JavaScript interpreter for .NET that executes **small** scripts (fairly) fast.

In order to execute the script, we have to create a JavaScript *engine*. The engine holds the execution environment where multiple scripts will be executed from. We can populate variables, assemblies, …  
I my case, I wanted any script to be able to raise log events, as if they were running in the root application – in addition, I wanted it to be as close to the JavaScript `console` global object as possible.

Populating an `ILogger` instance directly into the engine was not working. I think it has to be with the fact that logging methods (`LogInformation`, `LogWarning`, …) are extension methods, so you’d have to populate the `LoggingExtensions` class too, and invoke the methods directly from the extensions class (to be honest, I don’t really remember that). Anyways, even if it was working, it wouldn’t look any close to the JavaScript `console` global object!  
I implemented a proxy class to populate an entire `ILogger` (with all the extension methods).

```csharp
public class VirtualConsole
{
    private readonly ILogger _logger;
    
    public VirtualConsole(ILogger logger)
    {
        _logger = logger;
    }
    
    public void Log(string message, params object[] args) =>
        _logger.LogInformation(message, args);
    
    public void Warn(string message, params object[] args) =>
        _logger.LogWarning(message, args);
    
    public void Error(string message, params object[] args) =>
        _logger.LogError(message, args);
    
    // Trace, Debug and Critical
}
```

With the `VirtualConsole` in place, the engine can be created and configured.

```csharp
using Jint;
using Microsoft.Extensions.Logging;

public static class JsEngineFactory
{
    public static Engine Create(ILogger logger, CancellationToken token = default)
    {
        var console = new VirtualConsole(logger);
        return new Engine(options =>
        {
            options.CancellationToken(token);
            options.Configure(engine =>
            {
                options.SetValue("console", console);
            });
        });
    }
}
```

Alright, then! `VirtualConsole` ready, `JsEngineFactory` ready. Let’s test it out.

```csharp
var logger = Mogger.Create(_testOutputHelper);
var engine = JsEngineFactory.Create(logger);

engine.Execute(@"console.Log('Hello from JS!')"); 
// 00:00:000.00 INFO  [16  ]: Hello from JS!

// Structured logs are working, too
engine.Execute(@"console.Log('Hello from {Site}!', 'JS')");
// 00:00:000.00 INFO  [16  ]: Hello from JS!
```

So now, how can we test this thing properly…?  
Mocking the `ITestOutputHelper` is not a good idea. We would be testing if **Mogger** is actually doing its job (which, of course, it is testing whether the engine is invoking the `ILogger` methods too, as a side effect), but that’s not testing our `JsEngineFactory`, in fact.

If you remember, the `IMogger` instance (result of the `Mogger.Create` method) exposes one property, `Proxied`; which gets the actual mocked `ILogger` instance. That’s the instance we want to assert to!  
But even easier than that, the `IMogger` interface has a bunch of assertion extension methods. They all grab call expressions of the proxied logger and apply assertions to it.

#### The Mogger assertion API

There are two basic methods to assert log calls, `MustHaveLogged` and `MustNotHaveLogged` (yeah, very original comparing to *FakeItEasy* methods). Both methods have some overloads to specify which kind of event the assertion has to look for.  
These methods are self-descripting.

With the `MustHaveLogged` method, we can implement the tests of our `JsEngineFactory`.

```csharp
public class JsEngineFactoryTests
{
    private readonly ITestOutputHelper _testOutputHelper;
    
    public JsEngineFactoryTests(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
    }
    
    [Theory]
    [InlineData(@"console.Trace('Hello from JS!')", LogLevel.Trace)]
    [InlineData(@"console.Debug('Hello from JS!')", LogLevel.Debug)]
    [InlineData(@"console.Log('Hello from JS!')", LogLevel.Information)]
    [InlineData(@"console.Warn('Hello from JS!')", LogLevel.Warning)]
    [InlineData(@"console.Error('Hello from JS!')", LogLevel.Error)]
    [InlineData(@"console.Critical('Hello from JS!')", LogLevel.Critical)]
    public void OnJsEngineCreated_Console_IsPopulated(string scriptTemplate, LogLevel level)
    {
        // Arrange
        var logger = Mogger.Create(_testOutputHelper);
        
        // Act
        var engine = JsEngineFactory.Create(logger);
        engine.Execute(scriptTemplate);
        
        // Assert
        logger.MustHaveLogged(logLevel);
    }
}
```

> We could even assert that an specific message was logged by accessing the call expression arguments.  
> Before that, you can check the [`ILogger.Log` method header][12] to see what arguments the method has to retrieve particular call expressions to assert.
>
> ```csharp
> [Fact]
> public void OnJsEngineCreated_Console_Logs_ExactMessage()
> {
>     var message = @"Hello from JS!";
>     
>     // Arrange
>     var logger = Mogger.Create(_testOutputHelper);
>     
>     // Act
>     var engine = JsEngineFactory.Create(logger);
>     engine.Execute($"console.Log('{message}')");
>     
>     // Assert
>     logger.MustHaveLogged(args =>
>     {
>         var msg = args.Get<object>("state")?.ToString();
>         return msg == message;
>     });
> }
> ```
>
> The `args` variable is the `ArgumentCollection` of the invoked method.

#### The bonus content nobody asked for

One thing I missed in *Jint* was the `setTimeout` function. You know, the function to execute an operation after an specified period.  
In .NET, awaiting `Task.Delay(..)` does this, why wouldn’t we populate this feature to *Jint*, too?

> **Disclaimer**  
> In today’s *Jint* version (v2.11.58), promises are in an experimental stage and *async*/*await* are not supported.  
> Take the next section easy and be aware.

First, since `Task` are not found in *Jint*, obviously; we have to implement a method to synchronize a `Task` in the safest way possible.  
The following method implementation is a personal interpretation of the Microsoft’s [`AsyncHelper` class][13].

```csharp
public static class TaskExtensions
{
    private static readonly TaskFactory _factory = new(
        CancellationToken.None,
        TaskCreationOptions.None,
        TaskContinuationOptions.None,
        TaskScheduler.Default);
    
    public static void Sync(this Task task)
    {
        _factory.StartNew(() => task)
            .Unwrap()
            .GetAwaiter()
            .GetResult();
    }
}
```

So, how the *.NET-ish* JavaScript `setTimeout` function version looks like?

```csharp
Action<Action, int> timeout = new Action<Action, int>((callback, intervalMillis) =>
{
    Task.Delay(intervalMillis).Sync();
    callback();
});
```

Simple enough. The `setTimeout` function takes a callback (with no return value) and an integer value that represents the amount of milliseconds to awit until the callback is executed. We can store this as an `Action` (again, with no return value) to populate to the engine.

```csharp
public static class JsEngineFactory
{
    private static Action<Action, int>> Timeout => new Action((callback, intervalMillis) =>
    {
        Task.Delay(intervalMillis).Sync();
        callback();
    });
    
    public static Engine Create(ILogger logger, CancellationToken token = default)
    {
        var console = new VirtualConsole(context.Logger);
        return new Engine(options =>
        {
            options.CancellationToken(token);
            options.Configure(engine =>
            {
                engine.SetValue("console", console);
                engine.SetValue("setTimeout", Timeout);
            });
        });
    }
}
```

> We don’t need to define the `setTimeout` with the given `CancellationToken` because it is already set to control the whole script execution.  
> Else, the `Timeout` property would look something like this.
>
> ```csharp
> private static Action<Action, int>> Timeout(CancellationToken token = default)
> {
>     return new Action((callback, intervalMillis) =>
>     {
>         // Wrap the action body with a try/catch
>         // of TaskCanceledException, optionally.
>         Task.Delay(intervalMillis, token).Sync();
>         callback();
>     });
>     
>     // engine.SetValue("setTimeout", Timeout(token));
> }
> ```

We are now ready to play with the engine and our new toy (which is not that existing, after all). However, we could somehow configure the engine to be much similar to a real JavaScript engine adding more and more features to it. It’s just a matter of time.

```csharp
var script = @"
  const delay = millis => {
    return new Promise(resolve => {
      setTimeout(resolve, millis);
    });
  }
  
  delay(1000).then(() => console.Log('Yay!'));
";

var logger = Mogger.Create(_testOutputHelper);
var engine = JsEngineFactory(logger);

engine.Execute(script);
```

```csharp
[Fact]
public void ScriptExecution_IsCanceled()
{
    var script = @"
      const delay = millis => {
        return new Promise(resolve => {
          setTimeout(resolve, millis);
        });
      }
      
      delay(200).then(() => console.log('Yay!'));
    ";
    
    // Arrange
    var logger = Mogger.Create(_testOutputHelper);
    var cts = new CancellationTokenSource(millisecondsDelay: 20);
    var engine = JsEngineFactory.Create(logger, cts.Token);
    
    // Act and Assert
    Assert.Throws<ExecutionCanceledException>(() => engine.Execute(script));
    logger.MustNotHaveLogged();
}
```

[1]: https://datalust.co/seq	"About Seq"
[2]: https://serilog.net/	"About Serilog"
[3]: https://logging.apache.org/log4net/	"About log4net"
[4]: https://nlog-project.org/	"About NLog"
[5]: https://github.com/moq/moq4 "About Moq"
[6]: https://nsubstitute.github.io/ "About NSubstitute"
[7]: https://fakeiteasy.github.io/ "About FakeItEasy"
[8]: https://xunit.net/	"About xUnit"
[9]: https://www.nuget.org/packages/Mogger/	"Mogger NuGet page"
[10]: https://github.com/sebastienros/jint	"About Jint"
[11]: https://github.com/aspnet/Logging/blob/2d2f31968229eddb57b6ba3d34696ef366a6c71b/src/Microsoft.Extensions.Logging.Abstractions/LoggerExtensions.cs#L428	"Microsoft.Extensions.Logging.LoggerExtensions#MessageFormatter (line 428)"
[12]: https://docs.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.ilogger.log?view=dotnet-plat-ext-6.0#microsoft-extensions-logging-ilogger-log-1(microsoft-extensions-logging-loglevel-microsoft-extensions-logging-eventid-0-system-exception-system-func((-0-system-exception-system-string)))	"Microsoft.Extensions.Logging.ILogger.Log method reference"
[13]: https://github.com/aspnet/AspNetIdentity/blob/main/src/Microsoft.AspNet.Identity.Core/AsyncHelper.cs	"ASP.NET AsyncHelper source code"
[14]: https://github.com/VRoxa/Mogger/blob/master/Mogger/Mock/Implementations/Mogger.cs	"Mogger source code"







