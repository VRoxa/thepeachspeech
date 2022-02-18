import { Directive, Input, OnInit } from "@angular/core";
import { Article } from "src/app/models/article.model";
import { RoutingService } from "src/app/services/routing.service";

@Directive()
export abstract class ArticleRouterBase implements OnInit {

  @Input() public article!: Article;
  public link!: string;

  constructor(private routingService: RoutingService) { }

  ngOnInit(): void {
    this.link = this.routingService.getArticleUrl(this.article);
  }
}