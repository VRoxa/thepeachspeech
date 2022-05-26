**Service locator** is an opinionated pattern where application components ask for their dependencies. Under the concept of dependency injection – which is *de facto* the modern workaround design, service location is still a thing.  
The locator – the actual dependencies provider – is no longer a god-like-looking static factory class dispatching dependencies; but a well-defined injectable container (which might or might not be the dependencies composition root).

Let’s take a concrete example to work with and see a service locator pattern introduced in a _dependency injection environment_.

> I will be using C# and [Autofac][1] entirely for this post as a personal choice. Anyways, the main idea applies to any dependency injection framework and another comparable statically typed language.

```csharp
public AuthentationStrategy
{
    GitHub,
    Microsoft,
    Google,
    Mail
}

public class LoginService
{
    private readonly ILifetimeScope _scope;
    
    public LoginService(ILifetimeScope scope)
    {
        _scope = scope;
    }
    
    public async Task<bool> LoginAsync(User user, AuthentationStrategy authenticationStrategy)
    {
        IUserAuthenticationService authenticationService = authenticationStrategy switch
        {
            AuthentationStrategy.GitHub => _scope.Resolve<GitHubUserAuthenticationService>(),
            AuthentationStrategy.Microsoft => _scope.Resolve<MicrosoftUserAuthenticationService>(),
            AuthentationStrategy.Google => _scope.Resolve<GoogleUserAuthenticationService>(),
            _ => throw new NotSupportedException(
                $"Authentication provider {authenticationStrategy:g} is not supported")
        };
        
        if (await authenticationService.AuthenticateAsync(user))
        {
            ..
        }
    }
}
```

Even in a _dependency injection environment_, while introducing a service locator many pattern related issues appear:

| Dependency obfuscation                                       | Inversion of control loss                                    | Harder testing                                               |
| ------------------------------------------------------------ | :----------------------------------------------------------- | ------------------------------------------------------------ |
| It is hard to tell which dependencies the component has. Since the component has access to any dependency, it becomes dependant on virtually anything. | The component explicitly asks for a concrete implementation resolution, breaking the _IoC_ principle as well as the abstraction gained by dependency injection (most of the time, at least). | Although service locator doesn’t directly mean that testing is impossible, by losing the abstraction over the dependencies testing becomes more tedious and error-prone. As a starting point, mocking requires to fake the locator and the dependencies, too. Moreover, changing the dependency related implementation of the SUT (*Service Under Test*) makes the test to fail at runtime, as expected; whilst using dependency injection by constructor makes it fail earlier, at compilation time. |

First things first, an immediate refactor can be done by pulling the service locator into its own service and make the component depend on this service. This solves the previous concerns.

```csharp
public class LoginService
{
    private readonly IUserAuthenticationServiceProvider _provider;
    
    public LoginService(IUserAuthenticationServiceProvider provider)
    {
        _provider = provider;
    }
    
    public async Task<bool> LoginAsync(User user, AuthentationStrategy authenticationStrategy)
    {
        var authenticationService = _provider.Provide(authenticationStrategy);
        if (await authenticationService.AuthenticateAsync(user))
        {
            ..
        }
    }
}
```

Of course, we are just sweeping the problem under the carpet; but we kept it in a controlled service whose intention is to implement the service locator. At least, the provider service is clear: “it provides an `IUserAuthenticationService` based on a `AuthentationStrategy`, that’s why it depends on the entire dependency container”.

```csharp
public interface IUserAuthenticationServiceProvider
{
    public IUserAuthenticationService Provide(AuthentationStrategy authenticationStrategy);
}

public class UserAuthenticationServiceProvider : IUserAuthenticationServiceProvider
{
    private readonly ILifetimeScope _scope;
    
    public UserAuthenticationServiceProvider(ILifetimeScope scope)
    {
        _scope = scope;
    }
    
    public IUserAuthenticationService Provide(AuthentationStrategy authenticationStrategy)
    {
        return authenticationStrategy switch
        {
            AuthentationStrategy.GitHub => _scope.Resolve<GitHubUserAuthenticationService>(),
            AuthentationStrategy.Microsoft => _scope.Resolve<MicrosoftUserAuthenticationService>(),
            AuthentationStrategy.Google => _scope.Resolve<GoogleUserAuthenticationService>(),
            _ => throw new NotSupportedException(
                $"Authentication provider {authenticationStrategy:g} is not supported")
        };
    }
}
```

I’d normally stop things here. The `LoginService` is clean enough for a good design and a pretty straightforward testing – mocking the `IUserAuthenticationServiceProvider` is a trivial task, now. The `IUserAuthenticationServiceProvider` encapsulates the service locator in a fence where it can be easily tamed. Testing it would be easier, since we only have to focus on the dependency resolution.

```csharp
public class UserAuthenticationServiceProviderTests
{
    private ILifetimeScope FakeScope
    {
        get
        {
            var builder = new ContainerBuilder();
            builder.RegisterType<GitHubUserAuthenticationService>();
            builder.RegisterType<MicrosoftUserAuthenticationService>();
            builder.RegisterType<GoogleUserAuthenticationService>();
            
            return builder.Build();
        }
    }
    
    [Theory]
    [InlineData(AuthentationStrategy.GitHub, typeof(GitHubUserAuthenticationService))]
    [InlineData(AuthentationStrategy.Microsoft, typeof(MicrosoftUserAuthenticationService))]
    [InlineData(AuthentationStrategy.Google, typeof(GoogleUserAuthenticationService))]    
    public void OnProvideCalled_Service_IsResolved(
        AuthentationStrategy authenticationStrategy,
        Type expectedServiceType)
    {
        // Arrange
        var sut = new UserAuthenticationServiceProvider(FakeScope);
        // Act
        var providedService = sut.Provide(authenticationStrategy);
        // Assert
        Assert.IsType(expectedServiceType, providedService);
    }
    
    [Fact]
    public void OnProvideCalled_WithUnsupportedStrategy_ExceptionIsThrown()
    {
        // Arrange
        var sut = new UserAuthenticationServiceProvider(FakeScope);
        // Act & Assert
        Assert.Throws<NotSupportedException>(() => sut.Provide(AuthentationStrategy.Mail));
        // For example...
    }
}
```

Taking a step further, what if we finally try to blow the service locator off?  
Aside from service locator related issues, the current `UserAuthenticationServiceProvider` breaks the [_Open-Closed Principle_][2]; extending the application to support more authentication strategies – implementing a new `IUserAuthenticationService` – requires us to modify the `UserAuthenticationServiceProvider` implementation. _TLDR_; this is a **code smell**.

In order to make our provider closed for modification – while keeping it open to extension, we have to remove any _service resolution logics_ from it. The provider should be totally unaware of which services correspond to a particular `AuthentationStrategy` value.  
This know-how could rely on the service implementations themselves.

```csharp
public interface IUserAuthenticationService
{
    public AuthentationStrategy Strategy { get; }
    
    public Task<bool> AuthenticateAsync(User user);
}
```

All things considered, it is not ideal. The `IUserAuthenticationService` now exposes a niche property which is only used for its own resolution. “I” tells us the solution for that, [_Interface segregation Principle_][3].

```csharp
public interface IUserAuthenticationService
{
    public Task<bool> AuthenticateAsync(User user);
}

public interface IResolvableByAuthenticationStrategy
{
    public AuthentationStrategy Strategy { get; }
}

public interface IResolvableUserAuthenticationService
    : IUserAuthenticationService, IResolvableByAuthenticationStrategy
{
}
```

Naming pulled apart (try to find a better name when designing a real application), the provider would now look like this.

```csharp
public sealed class GitHubUserAuthenticationService : IResolvableUserAuthenticationService
{
    public AuthentationStrategy Strategy => AuthentationStrategy.GitHub;
    
    public Task<bool> AuthenticateAsync(User user) { .. }
}

// ...

public class UserAuthenticationServiceProvider : IUserAuthenticationServiceProvider
{
    private readonly IList<Lazy<IResolvableUserAuthenticationService>> _services;
    
    public UserAuthenticationServiceProvider(
        IList<Lazy<IResolvableUserAuthenticationService>> services)
    {
        _services = services;
    }
    
    public IUserAuthenticationService Provide(AuthentationStrategy authenticationStrategy)
    {
        return _services
            .FirstOrDefault(s => s.Value.Strategy == authenticationStrategy)
            ?.Value
            ?? throw new NotSupportedException(
                $"Authentication provider {authenticationStrategy:g} is not supported");
    }
}
```

> When it comes to the service registration, we could scan for types which implement the `IResolvableUserAuthenticationService` from the assembly to register them automatically. This would take the extensibility to a whole new level.
>
> ```csharp
> public static class ContainerBuilderExtensions
> {
>     public static void RegisterAuthenticationServices(
>         this ContainerBuilder builder,
>         Type? lookupType = default)
>     {
>         bool IsConcreteAuthenticationService(Type type) =>
>             !type.IsInterface &&
>             !type.IsAbstract &&
>             !type.IsGenericType &&
>             type.IsAssignableTo<IResolvableUserAuthenticationService>();
> 
>         var serviceTypes = (lookupType ?? typeof(ContainerBuilderExtensions))
>             .Assembly
>             .ExportedTypes
>             .Where(IsConcreteAuthenticationService);
> 
>         foreach (var serviceType in serviceTypes)
>         {
>             builder
>                 .RegisterType(serviceType)
>                 .As<IResolvableUserAuthenticationService>();
>         }
>     }
> }
> ```

We are left with a solution which satisfies SOLID but that has a noticeable big problem… The provider is resolving instances that might not be needed. I tried to mitigate this by injecting delayed instantiation dependencies (`Lazy<TService>`), but we still need to resolve the instance to check its `Strategy` value before discarding the dependency.  
This trade off is something to consider depending on whether you can afford this extra instantiation work (are these `IUserAuthenticationService` components hard to instantiate? Are their dependency tree expensive to resolve?). I myself avoid this approach quite often for this reason.

Back in the service locator thing, a more reasonable implementation would be to specify an `AuthentationStrategy` value at registration time. Autofac provides [registrations by key][4], a very handy feature in our case.

```csharp
public class UserAuthenticationModule : Autofac.Module
{
    protected override void Load(ContainerBuilder builder)
    {
        builder.RegisterType<GitHubUserAuthenticationService>()
            .Keyed<IUserAuthenticationService>(AuthentationStrategy.GitHub);
        
        builder.RegisterType<MicrosoftUserAuthenticationService>()
            .Keyed<IUserAuthenticationService>(AuthentationStrategy.Microsoft);
        
        builder.RegisterType<GoogleUserAuthenticationService>()
            .Keyed<IUserAuthenticationService>(AuthentationStrategy.Google);
        
        builder.RegisterType<UserAuthenticationServiceProvider>()
            .As<IUserAuthenticationServiceProvider>();
    }
}

public class UserAuthenticationServiceProvider : IUserAuthenticationServiceProvider
{
    private readonly ILifetimeScope _scope;
    
    public UserAuthenticationServiceProvider(ILifetimeScope scope)
    {
        _scope = scope;
    }
    
    public IUserAuthenticationService Provide(AuthentationStrategy authenticationStrategy)
    {
        return _scope.ResolveKeyed<IUserAuthenticationService>(authenticationStrategy);
    }
}
```

In a later stage refactoring, once the services are registered by its key, we could rip the `UserAuthenticationServiceProvider` off to register a factory delegate to do what the provider does. Basically, we want to inject a `Func<AuthentationStrategy, IUserAuthenticationService>` instead of an `IUserAuthenticationServiceProvider`.

```csharp
public class UserAuthenticationModule : Autofac.Module
{
    protected override void Load(ContainerBuilder builder)
    {
        // Services registrations by key.
        
        builder.Register<Func<AuthentationStrategy, IUserAuthenticationService>>(context =>
        {
            var scope = context.Resolve<ILifetimeScope>();
            return authenticationStrategy =>
            {
                return scope.ResolveKeyed<IUserAuthenticationService>(authenticationStrategy);
            };
        });
    }
}
```

> Notice that we are not returning the actual `IUserAuthenticationService` but a factory that will resolve it, so we have to capture the lifetime scope.  
> Invoking the `ResolveKeyed` method from the `context` we get in the outermost _lambda_ would cause an exception, because the `context` is disposed right after the _lambda_ finishes. Because of that, we have to capture the lifetime scope of the context to resolve our dependencies from it inside of the nested _lambda_.

----

Let’s imagine the following situation: your dependant component already knows which particular dependency it has to get (it no longer depends on a variable `AuthentationStrategy` value). For instance, a `GitHubLoginService` which depends on a `GitHubUserAuthenticationService` instance.  
It’d be quite annoying to inject a provider or a factory delegate and resolve the dependency from a “hardcoded” value every time. Our service doesn’t depend on  a `IUserAuthenticationService`; it depends on the specific `IUserAuthenticationService` keyed by a particular `AuthentationStrategy` value.  
Injecting the `GitHubUserAuthenticationService` directly is not a valid solution, since we would lose abstraction.

Autofac has a clean solution for that: [parameter filter attributes][5].  
Long story short, we can decorate constructor parameters to customize the dependency resolution. Actually, they are meant to specify whether a dependency can be resolved or not, but we will be taking advantage of this middleware.

```csharp
[AttributeUsage(AttributeTargets.Parameter)]
public class WithAuthenticationStrategy : ParameterFilterAttribute
{
    private readonly AuthentationStrategy _strategy;
    
    public WithAuthenticationStrategy(AuthentationStrategy strategy)
    {
        _strategy = strategy;
    }
    
    // Force the filter to true
    public override bool CanResolveParameter(
        ParameterInfo parameter,
        IComponentContext context) => true;
    
    public override object? ResolveParameter(ParameterInfo parameter, IComponentContext context)
    {
        // Resolve the dependency by the given key.
        return context.ResolveKeyed(_strategy, parameter.ParameterType);
    }
}
```

This attribute, as its name implies, will decorate a constructor parameter of the dependant component.  
The final result seems very neat and the there is no more service locator to think about.

```csharp
public class GitHubLoginService : ILoginService
{
    private readonly IUserAuthenticationService _authenticationService;
    
    public GitHubLoginService(
        [WithAuthenticationStrategy(AuthentationStrategy.GitHub)]
        IUserAuthenticationService authenticationService)
    {
        _authenticationService = authenticationService;
    }
    
    public async Task<bool> LoginAsync(User user)
    {
        if (await _authenticationService.AuthenticateAsync(user))
        {
            ..
        }
    }
}
```

> From C#11 and on, generic attributes are introduced, which allows us to implement a generic `ParameterFilterAttribute` for any (struct) key type.
>
> ```csharp
> [AttributeUsage(AttributeTargets.Parameter)]
> public class WithKey<TKey> : ParameterFilterAttribute
>     where TKey : struct
> {
>     private readonly TKey _key;
>     
>     public WithKey(TKey key)
>     {
>         _key = key;
>     }
>     
>     public override bool CanResolveParameter(
>         ParameterInfo parameter,
>         IComponentContext context) => true;
>     
>     public override object? ResolveParameter(
>         ParameterInfo parameter,
>         IComponentContext context)
>     {
>         return context.ResolveKeyed(_key, parameter.ParameterType);
>     }
> }
> 
> [AttributeUsage(AttributeTargets.Parameter)]
> public class WithAuthenticationStrategy : WithKey<AuthentationStrategy>
> {
>     public WithAuthenticationStrategy(AuthentationStrategy strategy)
>         : base(strategy)
>     {
>     }
> }
> ```

[1]: https://autofac.readthedocs.io/en/latest/	"About Autofac documentation"
[2]: https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html	"Robert C. Martin - Open Closed Principle explained"
[3]: https://ericbackhage.net/clean-code/solid-the-interface-segregation-principle/	"Robert C. Martin - Interface segregation Principle explained"
[4]: https://autofac.readthedocs.io/en/latest/advanced/keyed-services.html#keyed-services	"Autofac keyed service registration"
[5]: https://autofac.org/apidoc/html/1EAA0F30.htm	"ParameterFilterAttribute API documentation"







