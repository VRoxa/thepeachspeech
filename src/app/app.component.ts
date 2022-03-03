import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private traslateService: TranslateService
  ) { }

  ngOnInit() {
    const isKnownLanguage = (lang: string) => {
      return ['en', 'es'].includes(lang);
    }

    this.route.params.subscribe(({ lang }) => {
      !!lang && (isKnownLanguage(lang)
        ? () => this.traslateService.use(lang)
        : () => this.router.navigate(['/en'])
      )();
    });
  }
}
