import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { Article, ArticleDto } from '../models/article.model';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';

const mapLanguage = (lang: string) => {
  const toSpanish = lang === 'es';
  return (source: Observable<ArticleDto[]>) => {
    return source.pipe(
      map(articles => articles.map(article => {
        const title = toSpanish ? article.title_es : article.title;
        const oneliner = toSpanish ? article.oneliner_es : article.oneliner;
        return {...article, title, oneliner};
      }))
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class ArticlesService {

  constructor(
    private translateService: TranslateService,
    private http: HttpClient
  ) { 
  }

  private get lang(): string {
    return this.translateService.currentLang;
  }

  public getArticles(): Observable<Article[]> {
    return this.http
      .get<ArticleDto[]>(environment.dataUri)
      .pipe(
        mapLanguage(this.lang),
        map(articles => {
          return articles.map(({date, ...article}) => ({
            ...article,
            date: new Date(date)
          }));
        })
      );
  }
}
