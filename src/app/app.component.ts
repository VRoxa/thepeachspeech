import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private traslateService: TranslateService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      console.log(params);
      const lang = params['lang'];
      if (!!lang) {
        if (!['en', 'es'].includes(lang)) {
          console.log('redirecting', lang);
          this.router.navigate(['/en']);
        }
        this.traslateService.use(params['lang']);
      }
    });
  }
}
