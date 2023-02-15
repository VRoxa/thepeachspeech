import { Component, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, ViewportScroller } from '@angular/common';
import {
  combineLatest,
  delay,
  filter,
  finalize,
  first,
  firstValueFrom,
  map,
  mergeMap,
  Observable,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { ArticlesService } from 'src/app/services/articles.service';
import { HtmlService } from 'src/app/services/html.service';
import { sleep } from 'src/app/utils/utils';

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
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private scroller: ViewportScroller
  ) { }

  public get article$() {
    return this.vm$.pipe(
      map(({article}) => article)
    );
  }

  ngOnInit() {
    const routing$ = this.route.paramMap.pipe(
      map(params => params.get('url')!),
      // Start "loading flag" when route changes
      tap(() => this.fetchingArticle = true)
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
        tap(this.subscribeToHeaders),
        tap(this.scrollToAnchor),
        finalize(() => this.fetchingArticle = false)
      )),
      // Start HTML content stream with empty content
      // to make vm$ emit even when the first fetched article is not found (null)
      startWith(``),
      shareReplay(1)
    );

    // Declare the view model stream with the article and its content.
    this.vm$ = combineLatest([article$, htmlContent$]).pipe(
      map(([article, htmlContent]) => ({article, htmlContent}))
    );
  }

  private subscribeToHeaders = async () => {
    await sleep(200);

    // Danger levels
    document
      .querySelectorAll(`*[tabindex="-1"][id]:not([id=""])`)
      .forEach(target => {
        const { id } = target;
        target.addEventListener('click', event => {
          event.preventDefault();
          const url = this.router.url.replace(/^(?<base>[^#]+)(#.*)?/, `$<base>#${id}`);
          this.location.replaceState(url)
        })
      })
  }

  private scrollToAnchor = async () => {
    await sleep(500);
    const anchor = await firstValueFrom(this.route.fragment.pipe(filter(x => !!x)));
    this.scroller.scrollToAnchor(anchor!);
  }
}
