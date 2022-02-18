import { Component, Input, OnInit } from '@angular/core';
import { map, Observable, Subject } from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { ArticlesService } from 'src/app/services/articles.service';
import { RoutingService } from 'src/app/services/routing.service';

// Articles are related if they have at least one tag in common.
const areRelatedArticles = ({ tags: a }: Article, { tags: b }: Article) => {
  return a.some(tag => b.includes(tag));
}

@Component({
  selector: 'peach-related-articles',
  template: `
  <p class="title"> Related articles </p>

  <mat-divider></mat-divider>
  
  <mat-list>
    <mat-list-item *ngFor="let article of articles$ | async">
      <a (click)="enrouteArticle(article)">{{ article.title }}</a>
    </mat-list-item>
  </mat-list>
  `,
  styles: [`.title { text-align: center; }`]
})
export class RelatedArticlesComponent implements OnInit {

  @Input('article') article$!: Subject<Article>;
  public articles$?: Observable<Article[]>;

  constructor(
    private articlesService: ArticlesService,
    private routingService: RoutingService
  ) { }

  ngOnInit(): void {
    this.article$.subscribe(next => {
      this.articles$ = this.articlesService.getArticles()
        .pipe(
          // Filter the current article
          map(articles => articles.filter(({ url }) => url !== next.url)),
          // Filter unrelated articles
          map(articles => articles.filter(
            article => areRelatedArticles(article, next))
          ),
        );
    });
  }

  public enrouteArticle(article: Article): void {
    this.routingService.enrouteArticle(article);
  }
}
