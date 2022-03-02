import { Component } from '@angular/core';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'peach-language-toggle',
  template: `
    <div class="container">
      <button mat-icon-button 
        (click)="toggle()"
      >
        <mat-icon class="icon">
          language
        </mat-icon>
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

export class LanguageToggleComponent {

  private language: string;

  // true -> English
  // false -> Spanish
  public checked: boolean;

  constructor(private languageService: LanguageService) { 
    this.language = languageService.currentLanguage;
    this.checked = this.language === 'en';
  }

  public toggle = () => {
    this.checked = !this.checked;
    this.languageService.currentLanguage = this.language === 'en' 
      ? 'es' 
      : 'en';
  }
}