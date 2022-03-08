He estado usando Angular regularmente durante los últimos tres años. Angular es un *framework web* con el que me siendo cómodo (el que más, claramente) y, además, casi siempre que uso Angular, lo uso con Angular Material.  
Material ofrece los componentes y el estilo que mis *webs* necesitan sin ningún tipo de esfuerzo por mi parte, y encaja perfectamente con Angular, obviamente.

> Algunos dirán que Angular Material ya no es tendencia últimamente. Personalmente, voy a seguir usándolo porque ya estoy acostumbrado y me parece basatante fluido y bonito.  
> De todas formas, nunca he estado mucho por las tendencias de diseño.

Sin duda, la funcionalidad que más me gusta de Angular Material son los diálogos. No soy demasiado bueno en desarrollo *web*, y soy un total desastre en diseño *web*. Por tanto, la posibilidad de poner ese valor añadido a la *web* escribiendo sólo unas pocas líneas de código es increíble. Me sentiría realmente frustrado teniendo que implementarlo por mí mismo, aprendiendo cómo abrir componentes flotantes, los *backdrops*, tratando con el *z-index*, los *focus*, …

Entender cómo implementar los diálogos correctamente fue un poco tedioso, en un momento en el que no sabía nada sobre Angular, Typescript o incluso HTML y CSS. Un día me hizo *click* en mi mente y entendí la forma en la que trabajan y lo que realmente puedes hacer (o no) con ellos.

> ¿Cuántas veces te has enfrentado a este error en las herramientas de desarrollo de tu navegador?  
> `ERROR Error: No component factory found for MyDialog.`  
> `Did you add it to @NgModule.entryComponents?`  
>
> Siendo honesto, estaba intentando reproducir este mismo error para sacar el mensaje de error y me he dado cuenta de que los `entryComponents` de Angular están [obsoletos en Angular 13.0.1](https://github.com/angular/angular/blob/master/CHANGELOG.md#core-8), así que nunca vamos a volver a ver este mensaje jamás. ¿Qué tan fácil hubiese sido nuestra vida si esto hubiera ocurrido antes?

### El sistema de tipos del diálogo de Angular Material

Cuando se implementa un diálogo, tenemos que considerar tres argumentos de tipo: el tipo de datos de entrada, el tipo de datos de salida y el tipo del diálogo como tal. Haremos uso de estos tres tipos cuando interactuemos con nuestro diálogo des de fuera, como consumidores.  
Los componentes que necesiten abrir – e interactuar con – el diálogo deben conocer estos tres tipos y cómo se relacionan.

```typescript
// my.component.ts

// @Component({ ... })
export class MyComponent {
    
  constructor(private dialog: MatDialog) { }
    
  public openDialog = () => {
    // Los datos de entrada del diálogo
    const data = { one: 1 };
    const ref = this.dialog.open(MyDialog, { data });
      
    ref.afterClosed.subscribe(result => {
      // Resultado (result) de tipo 'any'
    });
  }
}
```

¿No ves algo raro?  
Nosotros, como consumidores del diálogo, hemos decidido qué tipo de entrada necesita el componente `MyDialog` y hemos recibido el resultado como un `any`, incluso cuando el componente de diálogo sabe exactamente qué tipo de datos está devolviendo cuando se cierra.  
El servicio `MatDialog` (y su función `open`) no nos da ninguna información sobre el diálogo que vamos a abrir. Por ejemplo, podríamos pasar cualquier objeto que quisiésemos y a Typescript le parecería perfecto. Esto es un sistema de tipos verdaderamente débil.

Yo suelo tipar los datos de entrada y salida cada vez que implemento un componente de diálogo para aclarar de qué se trata ese diálogo y cómo funciona. Aún así, me esperaría que esta información de pudiese conocer des de cualquier componente que necesite usar el diálogo.  
Es fácil trabajar con un diálogo que acabo de definir unos minutos atrás… Pero, ¿y aquellos diálogos que no son míos? ¿Tengo que abrir el código fuente de la clase del diálogo para ver qué necesita? ¿Tengo que incluir documentación sobre la clase del diálogo y cruzar los dedos para que los desarrolladores que vayan a usarlo lo hagan de la forma que he pensado?

Typescript **debe** prevenir que el consumidor del diálogo se equivoque con los tipos del mismo.  
Esta debilidad surge por el ~~inexistente~~ sistema de tipos de Angular Material. En serio, ¿por qué Angular Material no está infiriendo estos tipos para que deban cumplirse? Después de todo, ¿no es de eso de lo que se trata Typescript?

### Refinando el sistema de tipos

El mayor problema aquí es que no podemos “extraer” los argumentos de tipo de entrada y salida de la definición de tipo del diálogo (del componente). a menos que los saquemos del diálogo, nunca seremos capaces de inferir esos tipos a nadie.  
Por ello, vamos a definir una clase base de diálogo que exponga los tipos de entrada y salida. 

```typescript
// app-dialog.ts
type DialogRef<TParams, TResult> = MatDialogRef<AppDialog<TParams, TResult>, TResult>;

export class AppDialog<TParams, TResult> {
  constructor(
  	protected ref: DialogRef<TParams, TResult>,
    protected data?: TParams
  ) { }
}
```

La clase `AppDialog` tiene los tres tipos en su definición, *todo en uno*.  
A partir de ahora, todos los componentes de diálogo tendrán que extender de la clase `AppDialog`. Cada clase estará forzada a especificar qué argumentos de tipo necesita.

```typescript
// my-dialog.ts
export interface DialogInputData { 
  one: number;
  two: number;
}

export interface DialogOutputData {
  three: number;
}

// @Component({ ... })
export class MyDialog extends AppDialog<DialogInputData, DialogOutputData> {
  
  constructor(
  	private ref: MatDialogRef<MyDialog>,
    @Inject(MAT_DIALOG_DATA) private data: Readonly<DialogInputData>
  ) {
    super(ref, data);      
  }
    
  public close = () => {
    const output: DialogOutputData = ...;
    this.ref.close(output);
  }
}
```

Con esto, la clase `MyDialog` está exponiendo sus argumentos de tipo, pero aún no podemos usar esa información en ningún sitio…

Nos falta un enlace entre nuestro diálogo y el consumidor. La función `open` tiene que ser totalmente sobreescrita para acomodarse a nuestro nuevo sistema de tipos. En Typescript, hay una funcionalidad clave en su uso de tipos: la inferencia de tipos ([type inference](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types)). Échale un ojo si no sabes cómo funciona exactamente (aunque creo que se entenderá bien con el siguiente ejemplo).

```typescript
// dialog.service.ts

// Estos dos tipos de utilidad nos permiten "extraer" los argumentos de tipo
// genéricos de una clase hija AppDialog.
type ParamsOf<T> = T extends AppDialog<infer TParams, any> ? TParams : never;
type ResultOf<T> = T extends AppDialog<any, infer TResult> ? TResult : never;

type Constructor<T> = new (...args: any[]) => T;
type DialogConfig<T> = MatDialogConfig<ParamsOf<T>>;
type DialogRef<T> = MatDialogRef<T, ResultOf<T>>;

// @Injectable({...})
export class DialogService {
  
  // Inyectamos el servicio original
  constructor(private dialog: MatDialog) { }
    
  public open = <TDialog extends AppDialog<any, any>>(
  	type: Constructor<TDialog>,		// Inferimos el argumento de tipo TParams
    config?: DialogConfig<TDialog>	// Inferimos el argumento de tipo TResult
  ): DialogRef<TDialog> => {
    // Ahora estamos infiriendo nuestros tipos a la función open del MatDialog
    return this.dialog.open(type, config);
  }
}
```

Como puedes ver, el `DialogService` decora el servicio `MatDialog` y expone una nueva función `open` correctamente tipada. No hemos cambiado nada, realmente; la función `open` se comportará del mismo modo en tiempo de ejecución, pero hemos ganado esa experiencia de seguridad que esperamos de Typescript.

Des del punto de vista del consumidor, nada cambia cuando se hace un buen uso de los tipos del diálogo.

```typescript
// my.component.ts

// @Component({ ... })
export class MyComponent {
    
  // El DialogService se injecta,
  // en vez del servicio MatDialog.
  constructor(private dialog: DialogService) { }
    
  public openDialog = () => {
    const data = { one: 1, two: 2 };
    const ref = this.dialog.open(MyDialog, { data });
      
    ref.afterClosed.subscribe(result => {
      // Resultado (result) de tipo 'DialogOutputData'
      const { three } = result;
      // ..
    });
  }
}
```

> Podemos apreciar nuestro `DialogService` “en acción” cuando intentamos usar tipos incorrectos (no esperados).
>
> ```typescript
> // my.component.ts
> 
> // @Component({ ... })
> export class MyComponent {
>   // ..
> 
>   public openDialog = () => {
>     // Argument of type 'typeof NotADialogComponent' is not assignable to 
>     // parameter of type 'new (...args: any[]) => AppDialog<any, any>'.
>     const ref = this.dialog.open(NotADialogComponent);
>   
>     // Type '{ five: string; }' is not assignable to type 'DialogInputData'.
>     const ref = this.dialog.open(SomeDialogComponent, {
>       data: { five: 'Invalid' }
>     });
> 
>     const ref = this.dialog.open(SomeDialogComponent, {
>       data: { one: 1, two: 2 }
>     });
> 
>     // Argument of type '(res: string) => void' is not assignable 
>     // to parameter of type '(value: DialogOutputData) => void'.
>     ref.afterClosed().subscribe((res: string) => {...});
>   }
> }  
> ```
> Typescript se queja cuando intentamos “abrir” cualquier clase que no extiende de la clase `AppDialog`.  
> Pasar los tipos incorrectos como tipos de entrada produce errores de compilación, así como declarar el tipo de salida incorrecto.

#### El toque final

Teniendo una nueva función `open`, sería mejor usar siempre el `DialogService` en nuestra aplicación, pero hay algunas otras funciones en el servicio `MatDialog`.  
Si queremos una interfaz consistente para nuestro uso de diálogos, deberíamos evitar inyectar ambos servicios (`DialogService` y `MatDialog`) dependiendo de qué función queremos usar.  
Esto tiene fácil arreglo: vamos a popular las funciones restantes del `MatDialog` al `DialogService`.

```typescript
// dialog.service.ts

export class DialogService {
  
  constructor(private dialog: MatDialog) { }
    
  public get afterAllClosed(): Observable<void> {
    return this.dialog.afterAllClosed();
  }
    
  public get afterOpened(): Subject<MatDialogRef<any>> {
    return this.dialog.afterOpened;
  }
    
  public get openDialogs(): MatDialogRef<any> {
    return this.dialog.openDialogs;
  }
    
  public getDialogById = (id: string): MatDialogRef<any> | undefined => {
    return this.dialog.getDialogById(id);
  }
    
  // open
    
  public closeAll = (): void => {
  	this.dialog.closeAll();
  }
}
```

Ya no hay excusa para saltarnos el `DialogService` a partir de ahora.

> No todos los componentes de diálogo necesitan datos de entrada y salida. Si el diálogo no necesita alguno de los dos (o ambos), declararemos el argumento de tipo correspondiente como `never`.
>
> ```typescript
> // No se esperan datos de entrada
> export class MyDialog extends AppDialog<never, DialogOutputData> {...}
> 
> // No se esperan datos de salida
> export class MyDialog extends AppDialog<DialogInputData, never> {...}
> ```

### Conclusiones

Yo mismo obvié el problema que tenía el sistema de tipos del diálogo de Angular Material durante un tiempo. Aunque siempre me sentía de alguna forma incómodo con él, estaba acostrumbraado a ir cambiando de vistas entre la implementación del diálogo y el componente que lo usaba.  
La debilidad del sistema de tipos fue más notable cuando consumí diálogos de terceros en una aplicación.

En mi opinión, este `DialogSerive` no es algo tan importante como para ser una librería por sí mismo; de momento, sólo lo estoy copiando de proyecto en proyecto. Aún así, el sistema de tipos de `MatDialog` tiene que que mejorar – y el `DialogService` sólo es una solución entre otras muchas.

Me imagino que los tipos del `MatDialog` son tan débiles porque la inferencia de tipos en Typescript no estaba incluida cuando fue desarrollado – pero ya ha pasado tiempo des de que Microsoft añadió esta funcionalidad en el lenguaje.  
Fijándonos un poco en el sistema de tipos, nos podremos dar cuenta de que está bastante bien diseñado, **internamente** (de hecho, esa es al razón por la que somos capaces de implementar el `DialogService`).

Este artículo está enfocado en los diálogos porque es lo que más uso; pero este problema también aplica al `MatBottomSheet`, que tiene una interfaz muy similar.  
Realmente, espero que este artículo quede obsoleto muy pronto, lo que segnificaría que Google ha arregaldo el problema.

Explotar cada parte de nuestro lenguaje es cosa nuestra. Todas esas funcionalidades están puestas para ser usadas y, cuando se trata de Typescript, tenemos que asegurarnos de tiparlo todo adecuadamente, cuando sea posible.  
*Bugs remain at `any` point*.
