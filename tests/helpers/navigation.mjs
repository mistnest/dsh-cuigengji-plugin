/** Use the author's visible entry points, shared by the UI regression scripts. */
export async function openAuthorPage(page, name) {
  if (name === '写作预设') {
    await page.getByRole('button', {name: '设置', exact: true}).click();
    await selectSettingsCategory(page,'AI与写作');
    await page.getByRole('dialog',{name:'设置',exact:true}).getByRole('button', {name: '写作预设', exact: true}).click();
    return;
  }
  await page.getByRole('button', {name: '作品首页', exact: true}).click();
  if (name === '作品首页') return;
  if (name === '导入 / 导出') {
    await page.getByRole('button', {name:'设置',exact:true}).click();
    await selectSettingsCategory(page,'数据与备份');
    await page.getByRole('button', {name:'数据管理',exact:false}).click();
    await page.getByRole('group',{name:'导入导出切换'}).getByRole('button',{name:'导入',exact:true}).click();
    return;
  }
  await page.getByRole('button', {name: name === '作品与备份' ? '作品管理' : name, exact: true}).click();
}

export async function selectSettingsCategory(page,title) {
  const dialog=page.getByRole('dialog',{name:'设置',exact:true});
  const select=dialog.getByRole('combobox',{name:'设置分类',exact:true});
  if(await select.isVisible())await select.selectOption({label:title});
  else await dialog.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:title,exact:false}).click();
}

export async function showOrganization(page) {
  await page.waitForFunction(()=>{const root=document.querySelector('.organized-workspace');return root&&root.dataset.narrow===String(root.clientWidth<560);});
  if (!await page.locator('.workspace-sidebar').isVisible()) await page.getByRole('button', {name:'显示组织侧栏',exact:true}).click();
}
export function selectedPlanningPage(page) {return page.getByRole('listbox',{name:'规划画布',exact:true}).getByRole('option',{selected:true});}
export async function selectPlanningPage(page,id) {
  await showOrganization(page);
  await page.getByRole('listbox',{name:'规划画布',exact:true}).locator(`[data-page-id="${id||''}"]`).click();
}
