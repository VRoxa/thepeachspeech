According to the definition, **declarative programming** is a programming paradigm that relies on the *what*, rather than the *how*. It expresses the logic of a computation without describing its control flow.  
As a matter of fact, nowadays code is mostly declarative; being **functional programming** the pinnacle of this paradigm.  
**Imperative programming** is the opposite, which is based on statements that change the state of the program setting *how* the program behaves, explicitly.

Here’s a simple (and yet unnecessary) example to illustrate the obvious differences.

```typescript
// Imperative:
const multiplyElementsBy = (arr: number[], x: number) => {
    const result: number[] = [];
    
    // Iterates over every single element.
    for (let i = 0; i < arr.length; ++i) {
        // Calculates the new element (projection/mapping).
        const element = arr[i] * x;
        result.push(element);
    }
    
    return result;
}

// Declarative:
const multiplyElementsBy = (arr: number[], x: number) => {
	// Declares how to project/map an element.
    return arr.map(a => a * x);
}
```

**Reactive programming** is a declarative programming sub-paradigm that relies on time-ordered sequences of events.  
Statements describe how data must be mutated over time, without the need to work with the data itself; the stream becomes a pipeline of operations that apply to each event.  
Once all statements are set, the result of the pipeline is obtained (then side effects are performed with it).  
Operations (or statements) are basically pure functions that have a stream input and return a stream output; such as *monads* in **functional programming**.

[ReactiveX](https://reactivex.io/) is an API based on observable streams, and has a library for almost every language.  
Even using **ReactiveX** (or its JavaScript variant, [RxJS](https://rxjs.dev/), in that case) we can still barely scratch the surface of reactive programming or we can go very deep into it and leverage our code to a fully reactive programming approach.

Let’s suppose that we make an HTTP GET request and returns a collection of objects. From these objects, we need to filter some and make yet another HTTP GET request for each.

```typescript
declare const http: {
    get: <T>(url: string) => Observable<T>
};

type User = {
    id: string;
    isPremium: boolean
}

// Not so reactive
http.get<User[]>('https://example.com/users').subscribe(users => {
    const premiumUsers = users.filter(({ isPremium }) => isPremium);
    premiumUsers.forEach(({ id }) => {
        http.get<UserDetails>(`https://example.com/user/${id}`)
            .subscribe(userDetails => {
                // Do something with the user
            });
    });
});

// Reactive
const getPremiumUsersDetails = (): Observable<UserDetails> => {
    return http.get<User[]>('https://example.com/users').pipe(
        // Map Observable<User[]> to Observable<User>
        mergeMap(users => from([...users])),
        // Filter only premium users
        filter(({ isPremium }) => isPremium),
        // Projects every user to an Observable<UserDetails>
        mergeMap(user => 
            http.get<UserDetails>(`https://example.com/user/${id}`))
    );
}

getPremiumUsersDetails().subscribe(userDetails => {
    // Do something with the user
});
```

Being poorly reactive, the more statements and procedures we need, the more harder it gets to wire it up. A full reactive programming approach handles data as streams instead of the program state. There should be as less side effects as possible and intermediate state should not exist.  
Turning our coding paradigm from non-reactive to reactive is not immediate; since we tend to unwrap monads as soon as we can to start working on actual data. Reactive programming can be a “leap of faith” at first, but it gets more intuitive as we move along training our brain to think in terms of streams and operations.

----

Once the mandatory introduction is made, I want this article to be a journey through the [*The Peach Speech* site](https://vroxa.github.io/thepeachspeech/) source code to refactor the *RxJS* parts in a more reactive manner.  
I’d say the current implementation is somehow reactive. I never subscribe to a stream of data until data is completely relevant to what I need; that is filtering, mapping, performing side effects, etc. However, I am having a bad time when it comes to merging two (or more) sources of data into one. I just go for the simplest and most intuitive solution (for now, and for me), which is subscribing to the streams and maintaining the state by myself.

You will get what I mean in a minute.

### The articles view component

The `ArticleViewComponent` is responsible of rendering the current article.  
The article to render is known by the URL, so there’s an `Observable` that emits every routing event. When a new routing event is received, the component gathers the available articles collection to get the article that corresponds to the route. Then, the article content is requested to be rendered.

In the end, the HTML needs the article object and the article content (as HTML). We can consider that we have three sources of data here: the routing events, the articles and the HTML content per article.

The current implementation looks something like that – a simplified version.

```typescript
@Component({..})
export class ArticleViewComponent implements OnInit {
    
    public article$: Subject<Article> = new Subject<Article>;
    
    public article?: Article;
    public htmlContent?: string;
    
    public fetchingArticle!: boolean;
    
    constructor(
        private html: HtmlService,
        private service: ArticlesService,
        private router: Router
    ) { }
    
    ngOnInit() {
        this.article$.subscribe(article => {
            this.article = article;
        });
        
        // Routing events stream
        this.router.events
            .pipe(
                // Filter only navigation end events
                filter(event => event instanceof NavigationEnd),
                map(event => event as NavigationEnd),
                // Mapping the route to a meaningful URL
        	).subscribe(this.initializeArticle);
        
        // We have to initialize the article at first
        // to render the first article in the route.
        const { url } = this.router;
        this.initializeArticle(base);
    }
    
    private initializeArticle = (url: string) => {
        // Sanitizing URL
        
        // Managing component state.
        this.article = void 0;
        this.htmlContent = void 0;
        this.fetchingArticle = true;
        
        this.service.getArticles()
            .pipe(
                // Filters in the article we need
                first(article => article.url === url),
                // Null-checking. Throws an error if the article is not found.
                tap(article => !!article || throwArticleNotFound(url)),
                // Propagate article to the article subject
                tap(article => this.article$.next(article!)),
                // Maps to a new Observable that will emit the HTML content of the article
                mergeMap(article => this.html.getArticleContent(article!)),
                finalize(() => this.fethingArticle = false)
            ).subscribe(htmlContent => {
                this.htmlContent = htmlContent;
            });
    }
}
```

Okay, that was a lot to process. First of all, we see that we have three `subscribe` calls, while we stated that the component only needs two things: the `article` and the `htmlContent`.  
Actually, we can use the [`AsyncPipe`](https://angular.io/api/common/AsyncPipe) to avoid subscribing explicitly to these two sources. Angular will subscribe to the observables, and react to new values emitted – which will cause re-rendering a part of the component. Moreover, it will unsubscribe automatically from the source when the component is destroyed to improve performance and avoid memory leaking risks (in the case that a very fan of mine is spending hours and hours reading my posts).  
Doing so, we can get rid of the `article` and `htmlContent` properties. The state management of those is gone, too.

```typescript
@Component({..})
export class ArticleViewComponent implements OnInit {
    
    public article$: Subject<Article> = new Subject<Article>;
    public htmlContent$?: Observable<string>;
    public fetchingArticle!: boolean;
    
    // constructor
    
    ngOnInit() {
        this.router.events
            // pipe
            .subscribe(this.initializeArticle);
        
        const { url } = this.router;
        this.initializeArticle(base);
    }
    
    private initializeArticle = (url: string) => {
        this.fetchingArticle = true;
        
        // Reassign the htmlContent stream.
        // The article stream gets a new value
        // as a result of the getArticles() pipe.
        this.htmlContent$ = this.service.getArticles()
            .pipe(..);
    }
}
```

The solution we are left with is completely wrong because we are reassigning the `htmlContent$` over and over again. We don’t want multiple streams to handle, we just have to declare one, which will emit data over time so we can react on it.  
Now the big deal, we need to stop subscribing to the router events observable.  The route events observable is no more than intermediate state that must trigger the other two streams to produce new data, so we have to pipe the route events emissions to the `articles$` observable, in our case.  
The data flow will be,

1. New route event is emitted.
2. The related article is gathered from the given route.
3. The received article content is fetched and emitted.
4. Angular (the *ngZone*) reacts on new data.

We can define the `article$` observable as the combination of the current route URL and the available articles collection. `article$` won't be a `Subject<Article>` anymore, but an `Observable<Article>`, because we won't be emitting values to it explicitly. Instead, we are going to pipe the values from the routes stream and the articles stream.  
Using the [`combineLatest` operator](https://www.learnrxjs.io/learn-rxjs/operators/combination/combinelatest), let's create an observable that takes the latest two emitted values of routes and articles, to get the current article.

```typescript
const routing$ = this.router.events.pipe(
    // Filter only navigation end events
    // Mapping the route to a meaningful URL
);

const articles$ = this.service.getArticles();

this.article$ = combineLatest([routing$, articles$]).pipe(
    map(([url, articles]) => articles.find(
        ({ url: articleUrl }) => articleUrl === url)
    )
);
```

From the `combineLatest` result observable, we get a tuple of available articles and the current `url`, which we can use to filter the related article.  
However, `combineLatest` only emits a new value when **all** the underlying observables emits at least one value, each. Our `routing$` observable is not going to emit a value until the route is changed (which doesn't happen on the first load of the component). We have to *mock* the first route emission. To do so, we'll use the [`concat` operator](https://www.learnrxjs.io/learn-rxjs/operators/combination/concat) which concatenates observables.

```typescript
const routing$ = concat(
    of(this.router.url),
    this.router.events.pipe(..)
).pipe(
    // Sanitizing URL
    shareReplay(1)
);
```

The [`shareReplay` operator](https://www.learnrxjs.io/learn-rxjs/operators/multicasting/sharereplay) is put to avoid the `this.router.events` observable pipe execution per subscription. The *state* of the emitted value will be shared among multiple subscribers. This will save us to execute unnecessary URL mappings and sanitations.

Last but not least, the `htmlContent$` can be get piping the `article$` observable to the `getArticleContent` HTTP request.

```typescript
const htmlContent$ = this.article$.pipe(
    // We have to filter out not found articles.
    filter(article => !!article),
    mergeMap(article => this.html.getArticleContent(article!)),
);
```

Now that we have both `article$` and `htmlContent$` observables, the HTML can subscribe and receive all the data needed.  
To make it even cleaner, we can declare a single observable that emits all the data needed at once; let's call it the *view model*. Both observables will be "merged" using the `combineLatest` operator again.

 ```typescript
 interface ArticleViewModel {
     article: Article | undefined,
     htmlContent: string
 }
 
 @Component({..})
 public class ArticleViewComponent implements OnInit {
     
     public article$!: Observable<Article | undefined>;
     public vm$!: Observable<ArticleViewModel>;
     
     // constructor
     
     ngOnInit() {
         // Observables creation
         this.vm$ = combineLatest([this.article$, htmlContent$]).pipe(
             map(([article, htmlContent]) => ({article, htmlContent}))
         );
     }
 }
 ```

In the HTML, we have to be subscribed to the `vm$` observable, only.

```html
<ng-container *ngIf="vm$ | async as vm">
    <article>
        <header>
            <!-- Use vm.article -->
        </header>
        <div [innerHTML]="vm.htmlContent! | safe"></div>
    </article>
</ng-container>
```

There's one thing missing: as you may remember, `combineLatest` only emits values if all the underlying observables have emitted any value. Since we are filtering not found articles in the `htmlContent$` observable; if the first fetched article cannot be found, the `htmlContent$` observable won't emit a value for it, causing the `vm$` observable to not emit a value for it, either.  
Similar to the `concat` operator, we can use the [`startWith` operator](https://www.learnrxjs.io/learn-rxjs/operators/combination/startwith), to make this observable to emit a first value; signaling the `vm$` to emit a value too.

```typescript
const htmlContent$ = this.article$.pipe(
    filter(article => !!article),
    mergeMap(article => this.html.getArticleContent(article!)),
    // In my case, I don't care about the actual content, because
    // it won't be displayed at all.
    startWith(``)
);
```

The ~~simplified~~ final component implementation looks like this (check the [actual implementation](https://github.com/VRoxa/thepeachspeech/blob/master/src/app/components/article-view/article-view.component.ts) out).  
The `article$` observable is declared as a component attribute (with a getter) because child components need it. In the end, the component is only exposing a single observable, which emits any value used for rendering the page, reactively.

```typescript
@Component({..})
public class ArticleViewComponent implements OnInit {
    
    public vm$!: Observable<ArticleViewModel>;
    
    // constructor
    
    public get article$() {
        return this.vm$.pipe(
            map(({article}) => article)
        );
    }
    
    ngOnInit() {
        const routing$ = concat(
            of(this.router.url),
            this.router.events.pipe(
                // Filter only navigation end events
                // Mapping the route to a meaningful URL
            )
        ).pipe(
            // Sanitizing URL
            shareReplay(1)
        );
        
        const articles$ = this.service.getArticles();
        
        const article$ = combineLatest([routing$, articles$]).pipe(
            map(([url, articles]) => articles.find(
                ({url: articleUrl}) => articleUrl === url)
            )
        );
        
        const htmlContent$ = article$.pipe(
            filter(article => !!article),
            mergeMap(article => this.html.getArticleContent(article!)),
            startWith(``)
        );
        
        this.vm$ = combineLatest([article$, htmlContent$]).pipe(
            map(([article, htmlContent]) => ({article, htmlContent}))
        );
    }
}
```

> During the refactoring, I realized how poorly I was handling the route changes... Since `ArticleViewComponent` is a reactive component and the content is rendered by subscription but the component instance remains, we don't have to subscribe to the whole route change, but the activated one.  
> Instead of subscribing to the `this.route.events`, we can inject the current `ActivatedRoute`, and subscribe to its [`paramMap`](https://angular.io/api/router/ActivatedRoute#paramMap) changes.
>
> To do so, our application route has to be declared with a parameter.
>
> ```typescript
> const routes: Routes = [
>     { path: 'article/:url', component: ArticleViewComponent }
>     // ...
> ];
> 
> // Declare routing module.
> ```
>
> Now, Angular will provide the `link` parameter value in the `ActivatedRoute`. The `routing$` observable becomes way more simple and elegant this way; and we don't need to provide a first value for the stream (with the `concat` operator) because the `ActivatedRoute` will emit the current parameters map immediately.
>
> ```typescript
> @Component({..})
> export class ArticleViewComponent implements OnInit {
>     // ...
>     
>     constructor(
>         private html: HtmlService,
>         private service: ArticlesService,
>         private route: ActivatedRoute
>     ) { }
>     
>     ngOnInit() {
>         const routing$ = this.route.paramMap.pipe(
>             map(params => params.get('url'))
>         );
>         
>         // No more changes needed
>         // ...
>     }
> }
> ```

### The articles repository component

The `ArticlesRepositoryComponent` shows a data tree with all the existing articles. Articles are grouped by month.  
In the end, the component has to provide a collection of `ArticlesTreeNode`. Each `ArticlesTreeNode` can be a group holder (with children) or an actual article. The component processes the existing articles to the collection of `ArticlesTreeNode` which are used as the data of a  [`MatTreeFlatDataSource`](https://material.angular.io/components/tree/api), which will be finally rendered.

On the other side, there's an input which the user can filter articles with. The component is subscribed to the input change stream, and filters the tree nodes with every new value emitted.  
For now, there are two observables: the articles observable (with the projection to nodes) and the input value observable. The component is currently subscribed to both.

```typescript
interface ArticlesTreeNode {
    name: string;
    children?: ArticlesTreeNode[];
    article?: Article;
}

interface ArticlesTreeFlatNode {
    expandable: boolean;
    name: string;
    level: number;
    article?: Article;
}

const projectArticles = (articles: Article[]): ArticlesTreeNode[] => {
    ..
}

@Component({..})
export class ArticlesRepositoryComponent implements OnInit, AfterViewInit {
    
    @ViewChild('filter', { static: true }) filter!: ElementRef<HTMLInputElement>;
    
    public treeControl = new FlatTreeControl<ArticlesTreeFlatNode>(..);
    private treeFlattener = new MatTreeFlattener<ArticlesTreeNode, ArticlesTreeFlatNode>(..);
    
    public dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
    public nodes!: ArticlesTreeNode[];

    constructor(private service: ArticlesService) { }
    
    ngOnInit(): void {
        this.service.getArticles().pipe(
            map(projectArticles)
        ).subscribe(nodes => {
            this.nodes = nodes;
            this.dataSource.data = nodes;
        });
    }
    
    ngAfterViewInit(): void {
        // Subscribe to input value changes.
        valueFromEvent(this.filter.nativeElement)
            .subscribe(this.filterNodes);
    }
    
    private filterNodes = (searchValue: string) => {
        // Filter nodes by the search term.
        const nodes = this.nodes.map(..);
        // Filter empty groups.
        this.dataSource.data = nodes.filter(
            ({children}) => !!children && children.length > 0
        );
    }
    
    // ...
}
```

> The `valueFromEvent` is a custom `Observable<string>` factory. The result observable emits the values of the given element with a custom *debounce* time.
>
> ```typescript
> export type ValuableHtmlElement = HTMLElement & { value: string; };
> 
> export const valueFromEvent = <T extends ValuableHtmlElement>(
>     source: T,
>     debounce: number = 200
> ): Observable<string> => {
>     return fromEvent(source, 'keyup').pipe(
>         map(({ currentTarget }) => currentTarget as T),
>         map(({ value }) => value),
>         distinctUntilChanged(),
>         debounceTime(debounce)
>     );
> }
> ```

There's basically the same problem we had in the `ArticleViewComponent`: we are subscribed to two observables while we only have to provide only a single data stream (the collection of `ArticlesTreeNode`, in this case). We have to create an unnecessary state to handle both subscriptions, the `nodes` attribute.  
Again, let's combine these two observables into one single data source. The emitted values will be set to the `MatTreeFlatDataSource`, so the view can react on it.

```typescript
@Component({..})
export class ArticlesRepositoryComponent implements AfterViewInit {
    
    @ViewChild('filter', { static: true }) filter!: ElementRef<HTMLInputElement>;
    
    public treeControl = new FlatTreeControl<ArticlesTreeFlatNode>(..);
    private treeFlattener = new MatTreeFlattener<ArticlesTreeNode, ArticlesTreeFlatNode>(..);
    
    public dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
    
    constructor(private service: ArticlesService) { }
    
    ngAfterViewInit(): void {
        const searchTerm$ = valueFromEvent(this.filter.nativeElement).pipe(
            map(searchTerm => searchTerm.toLowerCase()),
            startWith(``)
        );
        
        const nodes$ = this.service.getArticles().pipe(
            map(projectArticles)
        );
        
        combineLatest([nodes$, searchTerm$]).pipe(
            map(([nodes, searchTerm]) => ..), // Filter articles by search term.
            map(nodes => ..), // Filter empty groups.
            tap(nodes => (this.dataSource.data = nodes))
        ).subscribe();
    }
}
```

Note that the assignment statement (`this.dataSource.data = nodes`) is not inside the `subscribe` function. As a general rule, `subscribe` methods should be empty and side effects will be performed in a `tap` operator (or in a [`finalize` operator](https://www.learnrxjs.io/learn-rxjs/operators/utility/finalize), depending on whether you want to perform the side effect per value emitted or when the observable completes). This brings way more control on the execution flow.

### Page title change behavior

One last thing to add in the web, even though it is not a refactoring (but an addition), is changing the page title depending on the current article in view. The premise is very straightforward.

```typescript
interface TitleView {
    title?: string;
    isRoot?: boolean;
    isFound?: boolean;
}

const getTitle = ({ title, isFound, isRoot }: TitleView) => {
    const rootTitle = `The Peach Speech`;
    return isRoot || !isFound
        ? rootTitle
        : `${title} | ${rootTitle}`;
}
```

In Angular, setting the page title can be done using the `Title` service (invoking the `setTitle` method).  
We know that an article is being rendered by the URL. I could implement this in the `ArticleViewComponent` – at the end of the `article$` stream, adding another `tap` operator that changes the title if the article is found and setting the default title in a `ngOnDestroy` lifetime hook function – but I prefer to leave that component as it is (and let it focus only on article rendering). So, the main `AppComponent` is the most suitable place to implement is, in my opinion. We know it will be always there, so it can track route changes perfectly.

However, if we inject an `ActivatedRoute` into this component, Angular will give us the root activated route (assuming that we first hit the application at the root). We have to keep track of the route navigation, then gather the `ActivatedRoute` per route.  
Once we have the current `ActivatedRoute`, it's just a matter of getting the route parameters (as we did in the `ArticleViewComponent`), then search the related article and set the title based on it.

```typescript
@Component({..})
export class AppComponent implements OnInit {
    
    constructor(
        private service: ArticlesService,
        private title: Title,
        private router: Router,
        private route: ActivatedRoute
    ) { }
    
    ngOnInit(): void {
        const getArticleTitle = (url: string): Observable<TitleView> => {
            return this.service.getArticleBy(url).pipe(
                map(article => ({
                    title: article?.title,
                    isFound: !!article
                }))
            );
        }
        
        this.router.events.pipe(
            filter(evt => evt instanceof NagivationEnd),
            map(() => this.route.firstChild),
            sswitch(
                route => !!route,
                route => route!.paramMap.pipe(map(params => params.get('url'))),
                _ => of(null)
            ),
            sswitch(
                url => !!url,
                url => getArticleTitle(url!),
                _ => of({ isRoot: true })
            ),
            map(getTitle),
            tap(title => this.title.setTitle(title))
        );
    }
}
```

The `sswitch` operator is a custom operator that pipes the current stream into another stream, depending on a given condition. It is like the [`iif` operator](https://www.learnrxjs.io/learn-rxjs/operators/conditional/iif) but every function parameter gets the latest emitted value – it is a combination between `iif` and `switchMap`, indeed.

```typescript
export const sswitch = <TSource, TResult = TSource>(
    condition: (value: TSource) => boolean,
    trueFactory: (value: TSource) => Observable<TResult>,
    falseFactory: (value: TSource) => Observable<TResult>
) => {
    return (source: Observable<TSource>): Observable<TResult> => {
        return source.pipe(
            switchMap(value => iif(
                () => condition(value),
                trueFactory(value),
                falseFactory(value)
            ))
        );
    }
}
```

The data stream is projected from the `ActivatedRoute` into the URL parameter; then, from the URL parameter into a `TitleView` object. The second `sswitch` can be nested inside the first one, as an extra operator of the `paramMap` observable. I prefer to reduce nesting levels and make it step by step, tho.

---

This refactoring session has been a journey for me, too. It helped me to leverage my reactive programming skills, beyond the usage of *RxJS* and its operators. I've seen all around people who say *RxJS* is easy. Well, *RxJS* makes reactive programming easy; but it is still hard. I think there's a misconception here... Reactive programming can solve some problems very easily – asynchronous data handling, of course; but nowadays, almost everything is asynchronous – but you first have to know it (and master it, sometimes).  
Getting to a solution that fits the problem is not immediate as it can be using other tools, it requires some time to analyze and think about it. Moreover, it makes code less "universal", since not that many people will understand it – the code will be very elegant, but not that readable even for a developer who is used to reactive programming.

All things being said, I personally will keep mastering reactive programming (specially *RxJS* and it's C# counterpart, [Rx.NET](https://github.com/dotnet/reactive)) until it gets as natural as writing a rudimentary `if` statement.

**Corollary**: reactive programming is very fun to code.
