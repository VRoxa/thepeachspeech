import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'peach-language-toggle',
  template: `
    <div class="container">
      <img
        [ngStyle]="{'opacity': lang === 'es' ? '0.4' : '1'}"
        (click)="toggle('en')"
        src="assets/img/uk.png"
        alt="UK"
      >
      <img
      [ngStyle]="{'opacity': lang === 'en' ? '0.4' : '1'}"
      (click)="toggle('es')"
        src="assets/img/sp.png"
        alt="SP"
      >
    </div>
`,
  styles: [`
    .container {
      display: flex;
      align-items: center;
      justify-content: center;
      
      img {
        margin: 0 0.2rem;
        cursor: pointer;
      }
    }
    .icon {
      font-size: 1.8rem;
    }

    .disabled {
      opacity: 0.5;
    }
  `]
})

export class LanguageToggleComponent {

  constructor(
    private router: Router,
    private translateService: TranslateService) { }

  public get lang() {
    return this.translateService.currentLang;
  }

  public toggle = (lang: string) => {
    if (lang === this.lang) {
      return;
    }

    // Navigate
    const [to] = ['en', 'es'].filter(l => l === lang);
    const { url } = this.router;
    const targetUrl = url.replace(`/${this.lang}`, to);
    this.router.navigate([targetUrl]);
  }
}