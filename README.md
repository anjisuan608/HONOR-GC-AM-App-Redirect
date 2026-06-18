<!--
  AGPLv3 License

  Copyright (C) 2026 anjisuan608 <anjisuan608@petalmail.com>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.

  SPDX-License-Identifier: AGPL-3.0-or-later
-->
# 荣耀游戏中心和应用市场详细页跳转页
## 仓库

仓库 | 地址 | 类型
:--------:|:--------:|:--------:
GitHub | [仓库地址](https://github.com/anjisuan608/HONOR-GC-AM-App-Redirect) | 主仓库
Gitee | [仓库地址](https://gitee.com/anjisuan608/HONOR-GC-AM-App-Redirect) | 镜像
GitCode | [仓库地址](https://gitcode.com/anjisuan608/HONOR-GC-AM-App-Redirect) | 镜像
GitLink | [仓库地址](https://gitlink.org.cn/anjisuan608/HONOR-GC-AM-App-Redirect) | 镜像

## 功能

提供软件包名，通过浏览器发起对荣耀游戏中心和荣耀应用市场的在线应用详细页的跳转。

### 参数

参数 | 取值 | 用途 | 默认值
:--------:|:--------:|:--------:|:--------:
plat | `GC` \| `AM` | 平台选择：GC=游戏中心、AM=应用市场 | `GC`
pkg | 任意字符串 | 应用包名，传值后自动填入输入框 | 无
go | `true` \| `false` | 是否自动跳转，`false` 时仅填入不跳转 | `true`
eg | 任意字符串 | 填入示例搜索框 + 展开示例列表 + 滚动定位 | 无
filter | `true` | 列表已展开时自动展开筛选器面板（`false` / 其他值保持现状） | 不传=不自动展开
select | `true` \| `false` | 筛选器总开关启用/停用 | 不传=保持默认
platform | `true` \| `false` | 「应用平台」分组开关 | 不传=保持默认
type | `true` \| `false` | 「应用类型」分组开关 | 不传=保持默认
honor | `true` \| `false` | 勾选/取消勾选"荣耀应用"分类 | 不传=保持当前
huawei | `true` \| `false` | 勾选/取消勾选"华为应用"分类 | 不传=保持当前
other | `true` \| `false` | 勾选/取消勾选"其它应用"分类 | 不传=保持当前
universal | `true` \| `false` | 勾选/取消勾选"通用应用"分类 | 不传=保持当前
phone | `true` \| `false` | 勾选/取消勾选"手机应用"分类 | 不传=保持当前
tablet | `true` \| `false` | 勾选/取消勾选"平板应用"分类 | 不传=保持当前

### 导航

名称 | 用途 | 备注
:--------:|:--------:|:--------:
eg | 示例软件 | 定位到示例软件的同时展开示例软件列表

## 示例列表

### packages.xml 格式

示例包名数据存储在 `packages.xml` 中，页面加载时通过 XHR 异步读取并渲染为按钮列表。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<packages>
    <package id="0">
        <name>显示名称</name>
        <pkg>com.honor.example</pkg>
        <note>备注说明</note>
    </package>
</packages>
```

字段说明：

字段 | 类型 | 必填 | 说明
:--------:|:------------:|:--------:|:--------------------------------:
`id` | 属性 | 是 | 唯一标识，正整数，建议递增
`type` | 类型 | 否 | 标识应用类别
`platform` | 平台 | 否 | 标识应用适用平台(手机/平板/通用)
`name` | 子元素 | 是 | 按钮显示名称
`pkg` | 子元素 | 是 | Android 应用包名
`note` | 子元素 | 否 | 备注说明，作为按钮的 `title` 悬停提示(tooltip)，同时参与搜索过滤

## 许可

项目基于[AGPLv3](./LICENSE)许可协议开源。