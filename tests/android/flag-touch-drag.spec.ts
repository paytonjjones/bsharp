import { expect, test } from "@playwright/test";
import { _android as android } from "playwright";
import type { AndroidDevice, Page } from "playwright";

const APP_PACKAGE = "com.bsharp.app";
const MAIN_ACTIVITY = `${APP_PACKAGE}/.MainActivity`;

type DevicePoint = { x: number; y: number };

type WebViewMetrics = {
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
};

async function shellText(device: AndroidDevice, command: string): Promise<string> {
  return (await device.shell(command)).toString("utf8").trim();
}

async function connectDevice(): Promise<AndroidDevice> {
  const devices = await android.devices();
  expect(
    devices.length,
    "No Android device/emulator found. Start one and verify `adb devices` before running this suite.",
  ).toBeGreaterThan(0);
  return devices[0];
}

async function launchFreshApp(device: AndroidDevice): Promise<Page> {
  const clearOutput = await shellText(device, `pm clear ${APP_PACKAGE}`);
  if (!/Success/i.test(clearOutput)) {
    throw new Error(
      `Could not clear ${APP_PACKAGE}; is the debug APK installed? Output: ${clearOutput}`,
    );
  }

  await device.shell(`am force-stop ${APP_PACKAGE}`);
  const startOutput = await shellText(device, `am start -n ${MAIN_ACTIVITY}`);
  if (/Error|Exception|not found|does not exist/i.test(startOutput)) {
    throw new Error(
      `Could not start ${MAIN_ACTIVITY}; run \`make test-android-touch\` or install the debug APK first. Output: ${startOutput}`,
    );
  }

  const webview = await device.webView({ pkg: APP_PACKAGE }, { timeout: 15_000 });
  const page = await webview.page();
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("#play-button")).toBeVisible();
  await expect(page.locator("#red-flag")).toBeVisible();
  await expect(page.locator("#stats-total")).toHaveText("0");
  return page;
}

async function getWebViewMetrics(
  device: AndroidDevice,
  page: Page,
): Promise<WebViewMetrics> {
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const webViewInfo = await device.info({
    pkg: APP_PACKAGE,
    clazz: /android\.webkit\.WebView/,
  });

  if (viewport.width <= 0 || viewport.height <= 0) {
    throw new Error(
      `Invalid WebView viewport from page JS: ${JSON.stringify(viewport)}`,
    );
  }

  if (webViewInfo.bounds.width <= 0 || webViewInfo.bounds.height <= 0) {
    throw new Error(
      `Invalid native WebView bounds from Android: ${JSON.stringify(webViewInfo.bounds)}`,
    );
  }

  return {
    originX: webViewInfo.bounds.x,
    originY: webViewInfo.bounds.y,
    scaleX: webViewInfo.bounds.width / viewport.width,
    scaleY: webViewInfo.bounds.height / viewport.height,
  };
}

async function locatorCenterOnDevice(
  device: AndroidDevice,
  page: Page,
  selector: string,
): Promise<{ point: DevicePoint; metrics: WebViewMetrics }> {
  const box = await page.locator(selector).boundingBox();
  if (!box) {
    throw new Error(`${selector} does not have a visible DOM bounding box`);
  }

  const metrics = await getWebViewMetrics(device, page);
  // DOM boxes are CSS pixels inside the WebView. device.input expects native
  // screen coordinates, so scale by the native WebView bounds and add its
  // Android-window origin.
  return {
    point: {
      x: Math.round(metrics.originX + (box.x + box.width / 2) * metrics.scaleX),
      y: Math.round(metrics.originY + (box.y + box.height / 2) * metrics.scaleY),
    },
    metrics,
  };
}

async function locatorPointOnDevice(
  device: AndroidDevice,
  page: Page,
  selector: string,
  xRatio: number,
  yRatio: number,
): Promise<{ point: DevicePoint; metrics: WebViewMetrics }> {
  const box = await page.locator(selector).boundingBox();
  if (!box) {
    throw new Error(`${selector} does not have a visible DOM bounding box`);
  }

  const metrics = await getWebViewMetrics(device, page);
  return {
    point: {
      x: Math.round(
        metrics.originX + (box.x + box.width * xRatio) * metrics.scaleX,
      ),
      y: Math.round(
        metrics.originY + (box.y + box.height * yRatio) * metrics.scaleY,
      ),
    },
    metrics,
  };
}

async function tapLocator(
  device: AndroidDevice,
  page: Page,
  selector: string,
): Promise<void> {
  const { point } = await locatorCenterOnDevice(device, page, selector);
  await device.input.tap(point);
}

async function startRound(device: AndroidDevice, page: Page): Promise<void> {
  await tapLocator(device, page, "#play-button");
  await page.waitForTimeout(1_000);
}

test("Android normal tap selects a flag", async () => {
  const device = await connectDevice();
  try {
    const page = await launchFreshApp(device);
    await startRound(device, page);

    await tapLocator(device, page, "#red-flag");

    await expect(page.locator("#stats-total")).toHaveText("1");
  } finally {
    await device.close();
  }
});

test("Android large drag inside same flag counts as answer", async () => {
  const device = await connectDevice();
  try {
    const page = await launchFreshApp(device);
    await startRound(device, page);

    const { point: start } = await locatorPointOnDevice(
      device,
      page,
      "#red-flag",
      0.2,
      0.5,
    );
    const { point: end } = await locatorPointOnDevice(
      device,
      page,
      "#red-flag",
      0.8,
      0.5,
    );

    await device.input.drag(start, end, 16);

    await expect(page.locator("#stats-total")).toHaveText("1");
  } finally {
    await device.close();
  }
});

test("Android drag leaving original flag does not count as answer", async () => {
  const device = await connectDevice();
  try {
    const page = await launchFreshApp(device);
    await startRound(device, page);

    const { point: start } = await locatorCenterOnDevice(
      device,
      page,
      "#red-flag",
    );
    const { point: end } = await locatorCenterOnDevice(
      device,
      page,
      "#yellow-flag",
    );

    await device.input.drag(start, end, 16);

    await expect(page.locator("#stats-total")).toHaveText("0");
    await expect(page.locator("#next-chord")).toHaveClass(/deactivated/);
  } finally {
    await device.close();
  }
});

test("Android small drag on flag counts as answer", async () => {
  const device = await connectDevice();
  try {
    const page = await launchFreshApp(device);
    await startRound(device, page);

    const { point: start, metrics } = await locatorCenterOnDevice(
      device,
      page,
      "#red-flag",
    );
    const end = {
      x: Math.round(start.x + 20 * metrics.scaleX),
      y: Math.round(start.y + 10 * metrics.scaleY),
    };

    await device.input.drag(start, end, 16);

    await expect(page.locator("#stats-total")).toHaveText("1");
  } finally {
    await device.close();
  }
});
