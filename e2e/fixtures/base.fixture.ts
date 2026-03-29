import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { PlayPage } from '../pages/play.page';
import { EditorPage } from '../pages/editor.page';
import { AdminPage } from '../pages/admin.page';

type Fixtures = {
  homePage: HomePage;
  playPage: PlayPage;
  editorPage: EditorPage;
  adminPage: AdminPage;
};

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  playPage: async ({ page }, use) => {
    await use(new PlayPage(page));
  },
  editorPage: async ({ page }, use) => {
    await use(new EditorPage(page));
  },
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
});

export { expect } from '@playwright/test';
