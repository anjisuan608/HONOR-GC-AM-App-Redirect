/**
 * AGPLv3 License

 * Copyright (C) 2026 anjisuan608 <anjisuan608@petalmail.com>

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.

 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// 荣耀游戏中心和应用市场应用详细页跳转

(function() {
    'use strict';

    // DOM 元素
    const pkgInput = document.getElementById('pkgname');
    const clearBtn = document.getElementById('clearBtn');
    const submitBtn = document.getElementById('submitBtn');
    const submitLabel = document.getElementById('submitLabel');
    const resultArea = document.getElementById('resultArea');
    const resultCode = document.getElementById('resultCode');

    // Deep Link 模板
    const DEEP_LINK_TEMPLATES = {
        gc: 'gamecenter://contents?pageid=1002&apkname=',
        am: 'honormarket://details?id='
    };

    // 示例包名数据缓存
    var examplePackages = [];

    /**
     * 获取选中的平台
     * @returns {string} 'gc' 或 'am'
     */
    function getSelectedPlatform() {
        const checked = document.querySelector('input[name="platform"]:checked');
        return checked ? checked.value : 'gc';
    }

    /**
     * 生成 Deep Link URL
     * @param {string} platform - 'gc' 或 'am'
     * @param {string} pkgName - 软件包名
     * @returns {string} 完整的 Deep Link URL
     */
    function generateDeepLink(platform, pkgName) {
        const template = DEEP_LINK_TEMPLATES[platform] || DEEP_LINK_TEMPLATES.gc;
        return template + encodeURIComponent(pkgName.trim());
    }

    /**
     * 验证包名格式
     * @param {string} pkgName - 要验证的包名
     * @returns {boolean} 是否有效
     */
    function isValidPackageName(pkgName) {
        if (!pkgName || !pkgName.trim()) {
            return false;
        }
        // Android 包名格式验证：至少一个点号，仅包含字母数字和点号
        const pkgRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
        return pkgRegex.test(pkgName.trim());
    }

    // 显示结果区域（带动画）
    function showResult() {
        resultArea.classList.add('visible');
    }

    // 隐藏结果区域
    function hideResult() {
        resultArea.classList.remove('visible');
    }

    // 处理清空操作
    function handleClear() {
        pkgInput.value = '';
        hideResult();
        pkgInput.focus();
    }

    // 处理提交操作
    function handleSubmit() {
        const pkgName = pkgInput.value;

        if (!isValidPackageName(pkgName)) {
            resultCode.textContent = '请输入有效的软件包名（如：com.hihonor.example）';
            showResult();
            return;
        }

        const platform = getSelectedPlatform();
        const deepLink = generateDeepLink(platform, pkgName);

        resultCode.textContent = '正在发起跳转……';
        showResult();

        // 尝试跳转
        window.location.href = deepLink;
    }

    /**
     * 处理输入框回车键事件
     * @param {KeyboardEvent} event
     */
    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSubmit();
        }
    }

    /**
     * 从 packages.xml 加载示例包名列表
     */
    function loadExamplePackages() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'packages.xml', true);
        xhr.responseType = 'document';
        xhr.onload = function() {
            if (xhr.status === 200 && xhr.responseXML) {
                var packages = xhr.responseXML.querySelectorAll('package');
                examplePackages = [];
                packages.forEach(function(pkg) {
                    examplePackages.push({
                        id: pkg.getAttribute('id'),
                        name: pkg.querySelector('name').textContent,
                        pkg: pkg.querySelector('pkg').textContent,
                        note: pkg.querySelector('note').textContent
                    });
                });
                renderExampleItems();
            }
        };
        xhr.send();
    }

    /**
     * 根据 Packages 数据渲染示例按钮
     */
    function renderExampleItems() {
        var container = document.getElementById('exampleItems');
        if (!container) return;

        container.innerHTML = '';
        examplePackages.forEach(function(item) {
            var btn = document.createElement('button');
            btn.className = 'example-chip';
            btn.type = 'button';
            btn.setAttribute('data-pkg', item.pkg);
            btn.setAttribute('title', item.note || '');

            var span = document.createElement('span');
            span.textContent = item.name;
            btn.appendChild(span);

            btn.addEventListener('click', function() {
                pkgInput.value = item.pkg;
                var platform = getSelectedPlatform();
                var deepLink = generateDeepLink(platform, item.pkg);
                resultCode.textContent = '正在发起跳转……';
                showResult();
                window.location.href = deepLink;
            });

            container.appendChild(btn);
        });
    }

    // 初始化事件监听器
    function initEventListeners() {
        clearBtn.addEventListener('click', handleClear);
        submitBtn.addEventListener('click', handleSubmit);
        pkgInput.addEventListener('keydown', handleKeyDown);

        // 输入变化时清空结果
        pkgInput.addEventListener('input', function() {
            if (!pkgInput.value.trim()) {
                hideResult();
            }
        });

        // 示例区域显示/隐藏切换
        var toggleBtn = document.getElementById('exampleToggle');
        var exampleItems = document.getElementById('exampleItems');
        if (toggleBtn && exampleItems) {
            toggleBtn.addEventListener('click', function() {
                var expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                if (expanded) {
                    // 折叠
                    exampleItems.style.maxHeight = exampleItems.scrollHeight + 'px';
                    // 强制重排后设为0，触发过渡动画
                    exampleItems.offsetHeight;
                    exampleItems.style.maxHeight = '0';
                    exampleItems.classList.remove('expanded');
                } else {
                    // 展开
                    exampleItems.classList.add('expanded');
                    exampleItems.style.maxHeight = exampleItems.scrollHeight + 'px';
                }
            });
        }
    }

    /**
     * 解析 URL 查询参数并执行对应操作
     * plat: GC（游戏中心）或 AM（应用市场），默认 GC
     * pkg: 包名，若有值则填入输入框
     * go: true（默认）自动跳转，false 仅填入不跳转
     */
    function handleUrlParams() {
        var params = new URLSearchParams(window.location.search);

        // 解析平台参数
        var plat = (params.get('plat') || '').toUpperCase();
        if (plat === 'AM') {
            document.getElementById('am').checked = true;
        } else {
            // 默认或 GC 均选择游戏中心
            document.getElementById('gc').checked = true;
        }

        // 解析包名参数
        var pkg = (params.get('pkg') || '').trim();
        if (pkg) {
            pkgInput.value = pkg;
            // go 不存在或 go=true 时自动跳转，go=false 仅填入
            var go = params.get('go');
            if (go !== 'false') {
                handleSubmit();
            }
        }
    }

    // 初始化应用
    function init() {
        initEventListeners();
        loadExamplePackages();
        handleUrlParams();
        // 仅在无 pkg 参数时聚焦输入框（避免跳转干扰）
        var params = new URLSearchParams(window.location.search);
        if (!params.get('pkg')) {
            pkgInput.focus();
        }
    }

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
