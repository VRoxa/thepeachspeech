import { Directive, Input, OnInit } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { Article } from "src/app/models/article.model";
import { RoutingService } from "src/app/services/routing.service";

@Directive()
export abstract class ArticleRouterBase implements OnInit {

  @Input() public article!: Article;
  public link!: string[];

  constructor(private routingService: RoutingService) { }

  ngOnInit(): void {
    const articleLink = this.routingService.getArticleUrl(this.article);
    this.link = articleLink;
  }

  public enrouteArticle = () => {
    this.routingService.enrouteArticle(this.article);
  }
}