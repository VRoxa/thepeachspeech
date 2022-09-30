import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  combineLatest,
  concat,
  filter,
  finalize,
  map,
  mergeMap,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { ArticlesService } from 'src/app/services/articles.service';
import { HtmlService } from 'src/app/services/html.service';

interface ArticleViewModel {
  article: Article | undefined,
  htmlContent: string
}

@Component({
  selector: 'peach-article-view',
  templateUrl: './article-view.component.html',
  styleUrls: ['./article-view.component.scss']
})
export class ArticleViewComponent implements OnInit {

  public vm$!: Observable<ArticleViewModel>;
  public fetchingArticle!: boolean;

  constructor(
    private html: HtmlService,
    private service: ArticlesService,
    private router: Router
  ) { }

  public get article$() {
    return this.vm$.pipe(
      map(({article}) => article)
    );
  }

  ngOnInit() {
    const routing$ = concat(
      of(this.router.url),
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        map(event => event as NavigationEnd),
        // Ignore fragment routing
        filter(({ url }) => !url.split('#')[1]),
        map(({ url }) => url)
      )
    ).pipe(
      // The router returns the URL with a leading slash.
      // We need to get the third element of the route, splitting by slash.
      // /article/article-1 -> [/, /article, article-1] -> article-1
      map(url => url.split('/')[2]),
      // Start "loading flag" when route changes
      tap(() => this.fetchingArticle = true),
      shareReplay(1)  
    );

    const article$ = routing$.pipe(
      switchMap(this.service.getArticleBy),
      // Stop "loading flag" if the article could not be found.
      tap(article => !!article || (this.fetchingArticle = false))
    );
      
    const htmlContent$ = article$.pipe(
      filter(article => !!article),
      mergeMap(article => this.html.getArticleContent(article!).pipe(
        // Stop "loading flag" when the content is received
        finalize(() => this.fetchingArticle = false)
      )),
      // Start HTML content stream with empty content
      // to make vm$ emit even when the first fetched article is not found (null)
      startWith(``),
    );

    // Declare the view model stream with the article and its content.
    this.vm$ = combineLatest([article$, htmlContent$]).pipe(
      map(([article, htmlContent]) => ({article, htmlContent}))
    );
  }
}
