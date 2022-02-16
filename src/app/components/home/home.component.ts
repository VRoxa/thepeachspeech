import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { ArticlesService } from 'src/app/services/articles.service';

@Component({
  selector: 'peach-home',
  template: `
  <peach-header></peach-header>

  <article *ngFor="let article of articles$ | async">
    <peach-article-anchor
      class="article"
      [article]="article"
    ></peach-article-anchor>
  </article>
  `,
  styles: [
    `
    article {
      display: flex;
      flex-direction: column;
      align-items: center;
    
      .article {
        width: 40%;
        margin-bottom: 1rem;
      }
    }
    `
  ]
})
export class HomeComponent implements OnInit {

  public articles$!: Observable<Article[]>;

  constructor(private service: ArticlesService) { }

  ngOnInit(): void {
    this.articles$ = this.service.getArticles();
  }

}
