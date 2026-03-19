import puppeteer, { type Browser, type Page } from "puppeteer-core";

export const VIEWPORT = { width: 1280, height: 800 };

export async function launchBrowser(downloadDir: string): Promise<{ browser: Browser; page: Page }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    ],
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Set up download behavior via CDP
  const client = await page.createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
  });

  return { browser, page };
}

export async function takeScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({
    type: "png",
    encoding: "binary",
  });
  return Buffer.from(buffer).toString("base64");
}

export interface ComputerAction {
  action: "click" | "type" | "scroll" | "key" | "screenshot" | "move" | "double_click" | "right_click" | "drag";
  coordinate?: [number, number];
  text?: string;
  start_coordinate?: [number, number];
  end_coordinate?: [number, number];
}

export async function executeAction(page: Page, action: ComputerAction): Promise<void> {
  switch (action.action) {
    case "click":
      if (action.coordinate) {
        await page.mouse.click(action.coordinate[0], action.coordinate[1]);
      }
      break;

    case "double_click":
      if (action.coordinate) {
        await page.mouse.click(action.coordinate[0], action.coordinate[1], { count: 2 });
      }
      break;

    case "right_click":
      if (action.coordinate) {
        await page.mouse.click(action.coordinate[0], action.coordinate[1], { button: "right" });
      }
      break;

    case "type":
      if (action.text) {
        await page.keyboard.type(action.text, { delay: 30 });
      }
      break;

    case "key":
      if (action.text) {
        // Convert common key names to puppeteer format
        const keyMap: Record<string, string> = {
          "Return": "Enter",
          "enter": "Enter",
          "Tab": "Tab",
          "Escape": "Escape",
          "Backspace": "Backspace",
          "space": "Space",
          "ctrl+a": "Control+a",
          "ctrl+c": "Control+c",
          "ctrl+v": "Control+v",
        };
        const key = keyMap[action.text] || action.text;

        if (key.includes("+")) {
          const parts = key.split("+");
          for (const part of parts.slice(0, -1)) {
            await page.keyboard.down(part as any);
          }
          await page.keyboard.press(parts[parts.length - 1] as any);
          for (const part of parts.slice(0, -1).reverse()) {
            await page.keyboard.up(part as any);
          }
        } else {
          await page.keyboard.press(key as any);
        }
      }
      break;

    case "scroll":
      if (action.coordinate) {
        await page.mouse.move(action.coordinate[0], action.coordinate[1]);
        // Scroll direction is typically encoded in text
        const scrollAmount = action.text === "down" ? 400 : -400;
        await page.mouse.wheel({ deltaY: scrollAmount });
      }
      break;

    case "move":
      if (action.coordinate) {
        await page.mouse.move(action.coordinate[0], action.coordinate[1]);
      }
      break;

    case "drag":
      if (action.start_coordinate && action.end_coordinate) {
        await page.mouse.move(action.start_coordinate[0], action.start_coordinate[1]);
        await page.mouse.down();
        await page.mouse.move(action.end_coordinate[0], action.end_coordinate[1]);
        await page.mouse.up();
      }
      break;

    case "screenshot":
      // No action needed - screenshot is taken after every action
      break;
  }

  // Small delay after each action for the page to react
  await new Promise((r) => setTimeout(r, 500));
}

export async function closeBrowser(browser: Browser): Promise<void> {
  try {
    await browser.close();
  } catch {
    // ignore close errors
  }
}
