import {expect} from '@playwright/test';
/** Click the actual wire, not the center of its (mostly empty) bounding box. */
export async function clickWire(page,locator,button='left'){
  const point=await locator.evaluate(path=>{
    const length=path.getTotalLength(),matrix=path.getScreenCTM();
    for(const fraction of [.5,.35,.65,.2,.8,.1,.9]){const p=path.getPointAtLength(length*fraction),screen=new DOMPoint(p.x,p.y).matrixTransform(matrix),hit=document.elementFromPoint(screen.x,screen.y);if(hit===path)return {x:screen.x,y:screen.y};}
    return null;
  });
  expect(point,'a visible segment of the wire must be clickable').not.toBeNull();
  await page.mouse.click(point.x,point.y,{button});
}
