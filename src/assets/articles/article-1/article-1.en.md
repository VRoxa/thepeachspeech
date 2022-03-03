**Lorem ipsum** dolor sit amet, consectetur adipiscing elit. Morbi scelerisque id enim eget dictum. Praesent at ante sollicitudin elit commodo sodales. In magna lorem, dapibus vitae egestas sed, euismod at massa. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; In mattis hendrerit ante. Pellentesque vel consequat mauris. Integer eu finibus arcu. Nulla eu nunc dignissim, iaculis dolor et, faucibus neque. Ut consectetur enim sapien, at finibus ipsum pulvinar ut. Phasellus interdum lorem sit amet purus commodo, nec dignissim diam suscipit. Etiam suscipit tortor sem, ut interdum felis vestibulum rutrum. Maecenas metus ex, volutpat vitae dictum sed, efficitur ac sapien. Cras rutrum augue ut metus egestas euismod sed ut dui.

[TOC]

## Lorem

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi scelerisque id enim eget dictum. Praesent at ante sollicitudin elit commodo sodales. In magna lorem, dapibus vitae egestas sed, euismod at massa. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; In mattis hendrerit ante.

Pellentesque vel consequat mauris. Integer eu finibus arcu. Nulla eu nunc dignissim, iaculis dolor et, faucibus neque. Ut consectetur enim sapien, at finibus ipsum pulvinar ut.

- [x] Done
- [ ] To be done
- [ ] To be done too

```csharp
using Autofac;

namespace Example;

public class ExampleModule : Module
{
    public override void Load(ContainerBuilder builder)
    {
        // Register connection client based on system's settings.
        buidler.Register<IConnectionClient>(context => 
        {
           var settings = context.Resolve<ConnectionSettings>();
           return settings.ConnectionType switch
           {
              ConnectionType.Udp => context.Resolve<UdpClient>(),
              ConnectionType.Tcp => context.Resolve<TcpClient>(),
              _ => context.Resolve<HttpClient>()
           };
        });
    }
}
```

Phasellus interdum lorem sit amet purus commodo, nec dignissim diam suscipit.

|    Header 1     | Header 2   | Header 3               | Header 4                                                     |
| --------------- | ---------- | ---------------------- | ------------------------------------------------------------ |
|    `Value 1`    | Loremipsum |                        | Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi scelerisque id enim eget dictum. |
|    `Value 2`    | Loremipsum |                        | Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi scelerisque id enim eget dictum. Praesent at ante sollicitudin elit commodo sodales. In magna lorem, dapibus vitae egestas sed, euismod at massa. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. |
|    `Value 3`    | Loremipsum | Duis mattis sapien sem | Duis augue nisi, fringilla et sodales sed, faucibus in dui. Aenean tempus, risus ut faucibus pellentesque, tellus nisi mattis lacus, dapibus fermentum augue metus in est. Morbi bibendum massa vel justo rutrum tempus. Nulla aliquam tempus sollicitudin. Mauris sit amet commodo elit. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Curabitur id consectetur sapien. Etiam tincidunt convallis metus sed posuere. Vestibulum tincidunt iaculis maximus. Vestibulum consectetur elementum vulputate. Pellentesque porta elit et quam iaculis posuere. Nam non pellentesque nisl, eu interdum neque. Mauris eros nibh, sagittis interdum placerat et, pulvinar sed enim. |
|    `Value 4`    | Loremipsum | Duis mattis sapien sem | Duis mattis sapien sem, quis ultricies leo pretium ac. Donec quis dignissim felis. Aliquam vulputate interdum fermentum. |
| `ExampleModule` | Loremipsum | Duismattis sapien sem  | Aenean ultrices eleifend orci. Curabitur nec ante elit. In et ullamcorper velit. Aliquam maximus, mauris pretium bibendum aliquet, justo nulla commodo massa, in volutpat turpis dolor ac ligula. In nec ipsum ullamcorper, ultrices ipsum nec, maximus metus. Phasellus condimentum condimentum eros, sed ultrices mi molestie sed. Pellentesque suscipit massa eget diam rutrum vulputate et et nisi. Suspendisse a risus laoreet, semper augue eget, maximus leo. Donec ultricies enim vitae tincidunt interdum. Integer quam ex, scelerisque vitae arcu eget, aliquet porttitor eros. |

### Ipsum

Etiam suscipit tortor sem, ut interdum felis vestibulum rutrum. Maecenas metus ex, volutpat vitae dictum sed, efficitur ac sapien.  
Cras rutrum augue ut metus egestas euismod sed ut dui.

> Duis augue nisi, fringilla et sodales sed, faucibus in dui. `Aenean tempus`, risus ut faucibus pellentesque, tellus nisi mattis lacus, dapibus fermentum augue metus in est. Morbi bibendum massa vel justo rutrum tempus. Nulla aliquam tempus sollicitudin. Mauris sit amet commodo elit.

### Dolor

Vestibulum nunc lacus, faucibus id risus aliquam, elementum placerat justo.

```json
// appsettings.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Trace",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Warning"
    }
  }
}
```

------------

## Sit amet

Donec pretium, massa eget dapibus consequat, risus nisl bibendum eros, vel dapibus nisl risus vel velit. Suspendisse ultricies, sapien vitae maximus ultricies, est turpis suscipit est, vitae aliquam metus felis nec dui. Sed non dui non nisi ultrices sollicitudin. Sed ut orci pellentesque, malesuada augue non, sollicitudin neque. Ut at quam lorem. Etiam pretium justo tellus, sed tincidunt leo molestie at. Nullam ac erat ut erat posuere interdum. Proin varius sagittis nisi, ut mattis risus sollicitudin ac.

Maecenas dictum leo quis dolor ornare, a venenatis erat facilisis. Sed lobortis scelerisque lacus, non pretium metus blandit ac. Praesent efficitur auctor venenatis. Aenean tincidunt sem eu purus vestibulum fringilla. Quisque vehicula diam in arcu euismod, nec finibus ipsum molestie. Pellentesque ullamcorper quam nec nulla sagittis aliquam. Praesent odio est, porttitor in ipsum quis, fringilla aliquet tellus. Duis commodo bibendum nisl non mollis. Etiam eget faucibus sapien, eget sollicitudin risus. Sed pulvinar placerat ornare. *Nulla tempus enim at leo fermentum, sit amet molestie nulla luctus*. Fusce eget elementum turpis, et venenatis tortor. Morbi et felis blandit, finibus lectus et, euismod [augue](https://google.com).

## Consectetur adipsicing

Nulla facilisi. Cras dictum egestas lectus, vel iaculis elit condimentum eget. Integer pulvinar velit et iaculis bibendum. Suspendisse est diam, ultricies a lectus vitae, dignissim suscipit ex.

Fusce consequat aliquet erat, ut lobortis urna ornare nec. Fusce sed erat pretium, convallis enim sed, sollicitudin purus. Maecenas vehicula erat mi, vitae accumsan nunc efficitur ac. Nam feugiat eget diam a luctus. Fusce dignissim, est non rutrum congue, ipsum lacus vulputate sapien, id blandit erat mi sed augue.

```typescript
import { filter, from, mergeMap, Observable } from "rxjs";

export type Predicate<T> = (value: T) => boolean;

export const spreadFind = <T>(predicate: Predicate<T>) => {
  return (source: Observable<T[]>): Observable<T> => {
    return source.pipe(
      mergeMap(arr => from([...arr])),
      filter(predicate)
    );
  }
}
```