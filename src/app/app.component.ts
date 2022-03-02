import { Component, OnInit } from '@angular/core';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  
  constructor(private languagrService: LanguageService) { }

  ngOnInit() {
    this.languagrService.init();
  }
}
