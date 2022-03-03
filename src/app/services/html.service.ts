import { Injectable } from '@angular/core';
import { Article } from '../models/article.model';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { parser } from 'src/app/utils/markdown-parser';
import { TranslateService } from '@ngx-translate/core';

const highlightInlineCode = (source: Observable<string>) => {
  return source.pipe(
    map(content => content.replace(/<code>/g, '<code class="hljs-keyword">'))
  );
}

const replaceTocLinks = (source: Observable<string>) => {
  return source.pipe(
    map(content => content.replace(/href="#([^"]+)"/g, `href="${window.location.pathname}#$1"`))
  );
}

@Injectable({
  providedIn: 'root'
})
export class HtmlService {

  constructor(
    private translateService: TranslateService,
    private http: HttpClient
  ) { }

  private get lang(): string {
    return this.translateService.currentLang;
  }

  public getArticleContent(article: Article): Observable<string> {
    const uri = this.getArticleUrl(article);
    return this.http
      .get(uri, { responseType: 'text' })
      .pipe(
        map(content => parser.render(content)),
        highlightInlineCode,
        replaceTocLinks
      );
  }

  private getArticleUrl({ url }: Article): string {
    const uri = `${environment.articleBaseUri}${url}/${url}.${this.lang}.md`;
    return uri;
  }
}
