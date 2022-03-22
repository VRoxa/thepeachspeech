I’ve been using Angular regularly for the last three years. Angular is a web framework I feel very comfortable with (clearly, the most) and, on top of that, almost every time I use Angular, I use it with Angular Material.  
Material offers the components and styling my webs need with no effort from me and it perfectly fits together with Angular, obviously.

> Some will say Material Design is not so trending nowadays. I will keep using it as I am so used to it and it still feels fluent and pretty to me.  
> Anyways, I’ve never been into web design trends that much.

The Angular Material feature I like the most is dialogs, clearly. I am not too good at web development, and I am terrible at web design. Hence, the possibility to add value to the web writing some lines of code is awesome. I’d be really frustrated to implement it by myself, learning to pop-up components, backdrops, dealing with *z-index*, focus…

Figuring out how to properly implement dialogs was a bit tedious in a time where I knew nothing about Angular, Typescript or even HTML and CSS. One day it just clicked in my mind and I undestood the way they work and what you can really (or not) do with them.

> How many times have you faced this error in your browser *devtools* console?  
> `ERROR Error: No component factory found for MyDialog.`  
> `Did you add it to @NgModule.entryComponents?`
>
> To be honest, I was trying to reproduce this error to extract the exact error message and I realized that Angular’s `entryComponents` are [deprecated in Angular 13.0.1](https://github.com/angular/angular/blob/master/CHANGELOG.md#core-8) so we will never get this message ever again. How easy would have been my life if this happened before?

### The Angular Material dialog type system

When implementing our dialog component, we have to consider three type arguments: the input data type, the output data type and the dialog component type by itself. These three types will be used when interacting with our dialog from the outside, as consumers.  
The component(s) who need to open – and interact with – the dialog must know how these three types are bound together.

```typescript
// my.component.ts

// @Component({ ... })
export class MyComponent {
    
  constructor(private dialog: MatDialog) { }
    
  public openDialog = () => {
    // The dialog's input data
    const data = { one: 1 };
    const ref = this.dialog.open(MyDialog, { data });
      
    ref.afterClosed.subscribe(result => {
      // result of type 'any'
    });
  }
}
```

Don’t you see anything weird?  
We, as the dialog consumer, decided what type the `MyDialog` components need as input and received the result of the dialog as `any`, even if the dialog component knows exactly what kind of data is returning back when closing itself.  
The `MatDialog` (and its `open` function) is not giving any information about the dialog we are about to open. For instance, we could just pass in any object we like and Typescript would be totally fine with it. That’s a really weak type system.

I use to type input and output data every time I implement a dialog component to make a clear annotation of what the dialog is and how it works. However, I’d really expect this information to be known by any component that needs to use the dialog.  
When I am using a dialog I just defined minutes ago, it’s easy to me to make it working… But what about those dialogs I don’t own? Do I have to open the source code of the dialog class to check what it needs? Do I have to include documentation to the dialog class and hope developers are use they way I thought?

Typescript **must** prevent the dialog consumer to mess with the dialog types.  
This weakness is because of Angular Material ~~inexistent~~ type system. Seriously, why Angular Material is not inferring these types so they have to be satisfied? Isn’t this the whole point of Typescript, after all?

### Refining the type system

The major problem here is that we cannot “extract” the input and output type arguments out of the dialog component type definition. We will never be able to infer these types back to anyone else unless we get those from the dialog.  
For that, let’s define a base dialog class that exposes the input and output types.

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

The `AppDialog` has the three types *all-in-one* in its definition.  
Every future dialog component will have to extend from the `AppDialog` class. The dialog class will be forced to specify what type arguments it expects.

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

Now, the `MyDialog` class is exposing its type arguments, but we can’t use this information anywhere…

We are missing the link between our dialog component and the consumer(s). The `open` function has to be totally overwritten to fit our new type system. There is one key in the Typescript type system usage that makes this possible: the [type inference](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types). Go check it out if you don’t know exactly how it works (I think it will be understood in the example below, anyway).

```typescript
// dialog.service.ts

// These two utility types allows us to "extract" the generic type arguments
// from an AppDialog child class.
type ParamsOf<T> = T extends AppDialog<infer TParams, any> ? TParams : never;
type ResultOf<T> = T extends AppDialog<any, infer TResult> ? TResult : never;

type Constructor<T> = new (...args: any[]) => T;
type DialogConfig<T> = MatDialogConfig<ParamsOf<T>>;
type DialogRef<T> = MatDialogRef<T, ResultOf<T>>;

// @Injectable({...})
export class DialogService {
  
  // Inject the original dialog service
  constructor(private dialog: MatDialog) { }
    
  public open = <TDialog extends AppDialog<any, any>>(
  	type: Constructor<TDialog>,		// Infer the TParams type arg
    config?: DialogConfig<TDialog>	// Infer the TResult type arg
  ): DialogRef<TDialog> => {
    // We are inferring our types to the MatDialog open function
    return this.dialog.open(type, config);
  }
}
```

As you can see, the `DialogSerice` decorates the `MatDialog` service and exposes a fresh new properly typed `open` function. We haven’t changed anything, the `open` function will behave the same way at runtime but we just gained the type safety experience we expect from Typescript.

From the consumer’s point of view, nothing changes when it makes a good use of the dialog types.

```typescript
// my.component.ts

// @Component({ ... })
export class MyComponent {
    
  // DialogService is injected,
  // instead of the MatDialog service.
  constructor(private dialog: DialogService) { }
    
  public openDialog = () => {
    const data = { one: 1, two: 2 };
    const ref = this.dialog.open(MyDialog, { data });
      
    ref.afterClosed.subscribe(result => {
      // result of type 'DialogOutputData'
      const { three } = result;
      // ..
    });
  }
}
```

> We can see our `DialogService` in action when trying to use unexpected types.
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
> 	// Type '{ five: string; }' is not assignable to type 'DialogInputData'.
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
> Typescript now complains about trying to open any class that does not extend the `AppDialog` class.  
> Passing the wrong type as the input data causes a compilation error, as well as declaring the wrong output type.

#### Final touches

Having a new `open` function, we’d better always use the `DialogService` in our application. There are some other functions in the `MatDialog`, though.  
If we want a consistent interface for our dialog usage, we should avoid injecting both `DialogService` and `MatDialog` services depending on what function we want to call.  
That’s an easy fix, let’s populate the remaining `MatDialog` functions to the `DialogService`.

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

There is no excuse to bypass the `DialogService` from now on.

> Not all dialog components need input data and output data. If the dialog component doesn’t need some of these two (or both), declare the corresponding type argument as `never`.
>
> ```typescript
> // No input data expected
> export class MyDialog extends AppDialog<never, DialogOutputData> {...}
> 
> // No output data expected
> export class MyDialog extends AppDialog<DialogInputData, never> {...}
> ```

### Conclusions

I myself haven’t noticed the Angular Material dialog type system problem for a while. On the other hand, although I always felt somehow uncomfortable with it, I used to be just switching views between the dialog implementation and the component back and forth.  
The whole weakness went noticeable when consuming third party dialog components in my application.

In my opinion, this `DialogService` thing is not that important to be a library to use by itself, I am just copying from project to project. However, the `MatDialog` type system must be improved – and the `DialogService` approach is just one solution among many others.

I wonder the `MatDialog` types are so weak because Typescript type inference wasn’t included by the time it was implemented – but it’s been a while since Microsoft added this feature to the language.  
If you pay closer attention to the type system, you will notice it is pretty well-designed internally (that’s why we were able to build the `DialogService`, indeed).

This article focused on dialogs because that’s what I use the most; but this problem also applies to the `MatBottomSheet`, which has a very similar interface.  
I really hope this article gets obsolete pretty soon, meaning that Google fixed this problem.

Exploiting every piece of our language is up to us. Those features are meant to be used and, when it comes to Typescript, we have to ensure a proper typing everywhere when possible.  
Bugs remain at `any` point.
