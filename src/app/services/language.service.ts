import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { Subject } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class LanguageService {

  private storageKey = 'lang';

  private languageChange: Subject<string> = new Subject<string>();

  constructor(private translateService: TranslateService) { }

  public get currentLanguage(): string {
    return localStorage.getItem(this.storageKey) ?? 'en';
  }

  public set currentLanguage(lang: string) {
    localStorage.setItem(this.storageKey, lang);
    this.translateService.use(lang);
    this.languageChange.next(lang);
  }

  public init = () => {
    this.translateService.setDefaultLang('en');
    this.translateService.use(this.currentLanguage);
  }
}
