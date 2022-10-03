import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { Article, ArticleDto } from '../models/article.model';
import { map, Observable, shareReplay } from 'rxjs';
import { environment } from 'src/environments/environment';
import { first } from '../utils/rx-operators';

@Injectable({
  providedIn: 'root'
})
export class ArticlesService {

  private articles$!: Observable<Article[]>;

  constructor(private http: HttpClient) { }

  public fetchArticles(): void {
    this.articles$ = this.http.get<ArticleDto[]>(environment.dataUri).pipe(
      map(articles => {
        return articles.map(({date, ...article}) => ({
          ...article,
          date: new Date(date)
        }));
      }),
      // The HTTP request is only made once.
      shareReplay(1)
    );
  }

  public getArticles = (): Observable<Article[]> => {
    return this.articles$;
  }

  public getArticleBy = (url: string): Observable<Article | undefined> => {
    return this.articles$.pipe(
      first(({url: articleUrl}) => url === articleUrl)
    )
  }
}
