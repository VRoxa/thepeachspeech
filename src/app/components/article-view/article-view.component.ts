import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, finalize, map, mergeMap, Subject, Subscription, tap } from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { ArticlesService } from 'src/app/services/articles.service';
import { HtmlService } from 'src/app/services/html.service';
import { RoutingService } from 'src/app/services/routing.service';
import { first } from 'src/app/utils/rx-operators';

const throwArticleNotFound = (url: string) => {
  throw new Error(`Article not found by URL ${url}`)
}

@Component({
  selector: 'peach-article-view',
  templateUrl: './article-view.component.html',
  styleUrls: ['./article-view.component.scss']
})
export class ArticleViewComponent implements OnInit, OnDestroy {

  public article$: Subject<Article> = new Subject<Article>();

  public articleUrl!: string;
  public article?: Article;
  public htmlContent?: string;
  public articleFullUrl!: string;
  
  public fetchingArticle!: boolean;
  public showFrame!: boolean;

  private routerSubscription?: Subscription;

  constructor(
    private html: HtmlService,
    private service: ArticlesService,
    private router: Router,
    private routingService: RoutingService
  ) { }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
  }

  ngOnInit() {

    this.article$.subscribe(article => {
      this.article = article;
    });

    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(event => event as NavigationEnd),
        // Ignore fragment routing
        filter(({ url }) => !url.split('#')[1]),
        map(({ url }) => url),
      )
      .subscribe(this.initializeArticle);

    const { url } = this.router;
    const [ base ] = url.split('#');
    this.initializeArticle(base);
  }
  
  private initializeArticle = (routingUrl: string) => {
    // The router returns the URL with a leading slash.
    // We need to get the third element of the route, splitting by slash.
    // /article/article-1 -> [/, /article, article-1] -> article-1
    const url = routingUrl.split('/')[3];

    this.article = void 0;
    this.showFrame = false;
    this.htmlContent = void 0;
    this.fetchingArticle = true;

    this.service.getArticles()
      .pipe(
        first(({ url: u }) => u === url),
        tap(article => !!article || throwArticleNotFound(url)),
        // Propagate article to article subject
        tap(article => article && this.article$.next(article)),
        mergeMap(article => this.html.getArticleContent(article!)),
        finalize(() => this.fetchingArticle = false)
      ).subscribe(htmlContent => {
          this.htmlContent = htmlContent;
      });
  }

  public navigateHome = () => {
    this.routingService.navigateHome();
  }
}
