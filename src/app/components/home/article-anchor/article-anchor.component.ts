import { Component, Input, OnInit } from '@angular/core';
import { Article } from 'src/app/models/article.model';
import { RoutingService } from 'src/app/services/routing.service';

@Component({
  selector: 'peach-article-anchor',
  templateUrl: './article-anchor.component.html',
  styleUrls: ['./article-anchor.component.scss']
})
export class ArticleAnchorComponent implements OnInit {

  @Input() public article!: Article;

  public link!: string;

  constructor(private routingService: RoutingService) { }
  
  ngOnInit(): void {
    this.link = this.routingService.getArticleUrl(this.article);
  }
}
