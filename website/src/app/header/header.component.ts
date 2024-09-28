import { NgIf } from '@angular/common';
import { Component, EventEmitter, inject, Output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgIf, TranslateModule ],
  providers: [
    TranslateService // Provide TranslateService manually
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() navigate = new EventEmitter();
  @Output() languageChanged = new EventEmitter();
  translate = inject(TranslateService);
  selectedNav = 'home';

  constructor() {
    const savedLang = localStorage.getItem('language') || 'nl';
    this.translate.setDefaultLang(savedLang);
    this.translate.use(savedLang);
  }

  clickedItem(name: string) {
    this.selectedNav = name;
    this.navigate.emit(name);
  }

  changeLanguage(event: any) {
    const language = event.target.value
    this.translate.setDefaultLang(language);
    this.translate.use(language);
    this.languageChanged.emit(language);
  }

  isHomePage = () => this.selectedNav === 'home';

}
