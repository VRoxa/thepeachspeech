import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Article } from "../models/article.model";

@Injectable({
  providedIn: "root"
})
export class RoutingService {

  constructor(private router: Router) { }

  private get root() {
    return this.router.routerState.root;
  }

  public enrouteArticle = (article: Article) => {
    const url = this.getArticleUrl(article);
    this.router.navigate([url], { relativeTo: this.root });
  }

  public getArticleUrl = (article: Article) => {
    return `/article/${article.url}`;
  }
}