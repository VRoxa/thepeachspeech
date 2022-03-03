import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'peach-language-toggle',
  template: `
    <div class="container">
      <button mat-icon-button 
        (click)="toggle()"
      >
        <mat-icon class="icon">language</mat-icon>
      </button>
      <img
        [src]="checked ? 'assets/img/uk.png' : 'assets/img/sp.png'"
        [alt]="checked ? 'UK' : 'SP'"
      >
    </div>
`,
  styles: [`
    .container {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon {
      font-size: 1.8rem;
    }
  `]
})

export class LanguageToggleComponent implements OnInit {

  // true -> English
  // false -> Spanish
  public checked!: boolean;

  constructor(
    private router: Router,
    private translateService: TranslateService) { }

  ngOnInit() {
    const changeLanguage = (lang: string) => {
      this.checked = lang === 'en';
    }

    changeLanguage(this.translateService.currentLang);
    this.translateService.onLangChange.subscribe(({ lang }) => {
      changeLanguage(lang);
    });
  }

  public toggle = () => {
    const navigate = (fromEnglish: boolean) => {
      const curr = fromEnglish ? 'en' : 'es';
      const to = fromEnglish ? 'es' : 'en';

      const { url } = this.router;
      const targetUrl = url.replace(`/${curr}`, to);
      this.router.navigate(['/', targetUrl]);
    }

    navigate(this.checked);
  }
}