import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './modules/app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from './modules/material.module';

// Services
import { ArticlesService } from './services/articles.service';

// Components
import { HomeComponent } from './components/home/home.component';
import { HeaderComponent } from './components/home/header/header.component';
import { ArticleAnchorComponent } from './components/home/article-anchor/article-anchor.component';
import { ArticleViewComponent } from './components/article-view/article-view.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    HeaderComponent,
    ArticleAnchorComponent,
    ArticleViewComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MaterialModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (service: ArticlesService) => () => service.fetchArticles(),
      deps: [ArticlesService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
