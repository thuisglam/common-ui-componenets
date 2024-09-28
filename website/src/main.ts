import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { provideHttpClient } from '@angular/common/http';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppModule, {
  ngZoneEventCoalescing: true
}).catch(err => console.error(err));

// bootstrapApplication(AppComponent, appConfig)
//   .catch((err) => console.error(err));
  // const injector = Injector.create({providers: [appConfig.providers]});

  // // // Create a custom element from the standalone component
  // const standaloneElement = createCustomElement(Headers, { injector });
  
  // // // Define the custom element for use in HTML
  // customElements.define('thuis-header', standaloneElement);