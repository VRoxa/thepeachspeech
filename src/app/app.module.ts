import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './modules/app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MaterialModule } from './modules/material.module';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// Services
import { ArticlesService } from './services/articles.service';

// Components
import { HomeComponent } from './components/home/home.component';
import { HeaderComponent } from './components/home/header/header.component';
import { ArticleAnchorComponent } from './components/home/article-anchor/article-anchor.component';
import { ArticleViewComponent } from './components/article-view/article-view.component';
import { ArticleNotFoundComponent } from './components/article-view/article-not-found/article-not-found.component';
import { ArticlesRepositoryComponent } from './components/articles-repository/articles-repository.component';
import { ArticleTreeNodeComponent } from './components/articles-repository/article-tree-node/article-tree-node.component';
import { RelatedArticlesComponent } from './components/article-view/related-articles/related-articles.component';

// Pipes
import { SafePipe } from './pipes/safe.pipe';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    HeaderComponent,
    ArticleAnchorComponent,
    ArticleViewComponent,
    ArticleNotFoundComponent,
    ArticlesRepositoryComponent,
    ArticleTreeNodeComponent,
    RelatedArticlesComponent,
    SafePipe,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MaterialModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    })
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
