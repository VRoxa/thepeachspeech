import { Component, Input } from '@angular/core';
import { Article } from 'src/app/models/article.model';

@Component({
  selector: 'peach-article-anchor',
  templateUrl: './article-anchor.component.html',
  styleUrls: ['./article-anchor.component.scss']
})
export class ArticleAnchorComponent {

  @Input() public article!: Article;

  public get link(): string {
    return this.article.url!;
  }

}
