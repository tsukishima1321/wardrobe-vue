# wardrobe
See repo [here](https://github.com/tsukishima1321/wardrobe) for the backend part.

## 地图服务

在「管理 → 配置 → 地图服务」选择 OSM、高德或天地图，再点击「保存地图设置」。选择天地图时需填写自己的 Token，可在 [天地图控制台](https://console.tianditu.gov.cn/) 获取。

配置保存在当前浏览器的 `wardrobe-map-settings` 中，照片地图和所有地图选点弹窗共用；同源其他标签页中的地图会同步切换。天地图使用矢量底图与中文注记，Token 无效、权限不足或网络异常时会显示可重试的错误提示。

位置数据继续以 WGS84 保存。高德底图使用 GCJ-02，地图投影负责显示与选点的双向转换，切换服务无需修改已有照片。该转换用于地图展示与选点，逆向转换为数值近似。OSM 仍支持构建时的 `VITE_MAP_TILE_URL` / `VITE_MAP_ATTRIBUTION` 覆盖。

坐标转换参考 [coordtransform](https://github.com/wandergis/coordtransform)，高德的坐标系说明见 [高德 JS API 文档](https://a.amap.com/jsapi/static/doc/20230922/index.html)。天地图服务采用 [WMTS 地图服务](https://lbs.tianditu.gov.cn/server/MapService.html)。

使用 Node.js 22.6+ 可运行地图配置与坐标回归测试：

```sh
yarn test:map
```

## Project Setup

```sh
yarn
```

### Compile and Hot-Reload for Development

```sh
yarn dev
```

### Type-Check, Compile and Minify for Production

```sh
yarn build
```
