import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { Article, ArticleDto } from '../models/article.model';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ArticlesService {

  private articles$!: Observable<Article[]>;

  constructor(private http: HttpClient) { }

  public fetchArticles(): void {
    this.articles$ = this.http
      .get<ArticleDto[]>(environment.dataUri)
      .pipe(
        map(articles => {
          return articles.map(({date, ...article}) => ({
            ...article,
            date: new Date(date)
          }));
        })
      );
  }

  public getArticles(): Observable<Article[]> {
    return this.articles$;
  }
}
