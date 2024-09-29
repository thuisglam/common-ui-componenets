import { ApplicationRef, DoBootstrap, Injector, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { createCustomElement } from '@angular/elements';
import { FooterComponent } from './footer/footer.component';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './i18n/', '.json');
}


@NgModule({
  declarations: [],
  imports: [
    FooterComponent,
    HeaderComponent,
    CommonModule,
    BrowserModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
  ]
})
export class AppModule implements DoBootstrap {

  constructor(private injector: Injector) {}

  ngDoBootstrap(appRef: ApplicationRef) {
    const headerComponent = createCustomElement(HeaderComponent, {
      injector: this.injector
    });
    const footerComponent = createCustomElement(FooterComponent, {
      injector: this.injector
    });
    customElements.define('thuis-header', headerComponent);
    customElements.define('thuis-footer', footerComponent);
    // appRef.bootstrap(HeaderComponent);
  }

 }