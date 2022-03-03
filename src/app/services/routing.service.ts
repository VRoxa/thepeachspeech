import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { Article } from "../models/article.model";

@Injectable({
  providedIn: "root"
})
export class RoutingService {

  constructor(
    private translateService: TranslateService,
    private router: Router) { }

  private get root() {
    return this.router.routerState.root;
  }

  public enrouteArticle = (article: Article) => {
    const lang = this.translateService.currentLang;
    const url = this.getArticleUrl(article);
    this.router.navigate(['/', lang, ...url], { relativeTo: this.root });
  }

  public getArticleUrl = (article: Article) => {
    return ['article', article.url];
  }

  public navigateHome = () => {
    const lang = this.translateService.currentLang;
    this.router.navigate(['/', lang]);
  }
}