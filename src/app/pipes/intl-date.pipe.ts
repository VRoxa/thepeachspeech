import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({ name: 'intldate' })
export class IntlDatePipe implements PipeTransform {

  constructor(private translateService: TranslateService) { }

  private get locale(): string {
    const { currentLang: lang } = this.translateService;
    return lang === 'es' ? 'es-ES' : 'en-UK';
  }

  public transform(date: Date): string {
    const formatter = new Intl.DateTimeFormat(this.locale, {
      dateStyle: 'long'
    });

    return formatter.format(date);
  }
} 