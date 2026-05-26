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
    const pasteBtn = document.getElementById('pasteBtn');

    // Deep Link 模板
    const DEEP_LINK_TEMPLATES = {
        gc: 'gamecenter://contents?pageid=1002&apkname=',
        am: 'honormarket://details?id='
    };

    // 示例包名数据缓存
    var examplePackages = [];

    // 是否自动跳转（go=false 时关闭，示例按钮点击也受此控制）
    var autoRedirect = true;

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
                // 数据加载完成后，处理 #eg hash 或 eg 查询参数
                var egParam = new URLSearchParams(window.location.search).get('eg');
                if (egParam && egParam.trim()) {
                    navigateToExamples(egParam.trim());
                } else if (window.location.hash === '#eg') {
                    expandExampleList();
                    setTimeout(function() {
                        var target = document.getElementById('eg');
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 100);
                }
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
                if (autoRedirect) {
                    var platform = getSelectedPlatform();
                    var deepLink = generateDeepLink(platform, item.pkg);
                    resultCode.textContent = '正在发起跳转……';
                    showResult();
                    window.location.href = deepLink;
                } else {
                    pkgInput.focus();
                }
            });

            container.appendChild(btn);
        });
    }

    /**
     * 根据搜索关键词过滤示例按钮显示
     * @param {string} keyword - 搜索关键词
     */
    function filterExampleItems(keyword) {
        var container = document.getElementById('exampleItems');
        if (!container) return;

        var chips = container.querySelectorAll('.example-chip');
        var lowerKeyword = keyword.toLowerCase().trim();

        chips.forEach(function(chip) {
            var name = chip.querySelector('span').textContent.toLowerCase();
            var pkg = chip.getAttribute('data-pkg').toLowerCase();
            var note = (chip.getAttribute('title') || '').toLowerCase();

            if (!lowerKeyword ||
                name.includes(lowerKeyword) ||
                pkg.includes(lowerKeyword) ||
                note.includes(lowerKeyword)) {
                chip.style.display = '';
            } else {
                chip.style.display = 'none';
            }
        });
    }

    // 初始化事件监听器
    function initEventListeners() {
        clearBtn.addEventListener('click', handleClear);
        submitBtn.addEventListener('click', handleSubmit);
        pkgInput.addEventListener('keydown', handleKeyDown);

        // 粘贴按钮点击事件
        if (pasteBtn) {
            pasteBtn.addEventListener('click', async function() {
                try {
                    const text = await navigator.clipboard.readText();
                    // 过滤换行符号
                    const filteredText = text.replace(/[\r\n]/g, '').trim();
                    pkgInput.value = filteredText;
                    // 触发 input 事件以更新 UI 状态
                    pkgInput.dispatchEvent(new Event('input', { bubbles: true }));
                    pkgInput.focus();
                } catch (err) {
                    // 剪贴板读取失败时不做处理
                }
            });
        }

        // 输入变化时清空结果
        pkgInput.addEventListener('input', function() {
            if (!pkgInput.value.trim()) {
                hideResult();
            }
        });

        // 搜索框输入事件
        var exampleSearch = document.getElementById('exampleSearch');
        var searchClear = document.getElementById('searchClear');
        if (exampleSearch) {
            exampleSearch.addEventListener('input', function() {
                filterExampleItems(this.value);
                // 控制清空按钮显示/隐藏
                if (searchClear) {
                    searchClear.hidden = !this.value.trim();
                }
            });
        }
        // 清空按钮点击事件
        if (searchClear) {
            searchClear.addEventListener('click', function() {
                if (exampleSearch) {
                    exampleSearch.value = '';
                    filterExampleItems('');
                    this.hidden = true;
                    exampleSearch.focus();
                }
            });
        }

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
                    // 清空搜索框并重置过滤
                    if (exampleSearch) {
                        exampleSearch.value = '';
                        filterExampleItems('');
                        if (searchClear) {
                            searchClear.hidden = true;
                        }
                    }
                } else {
                    // 展开
                    exampleItems.classList.add('expanded');
                    exampleItems.style.maxHeight = exampleItems.scrollHeight + 'px';
                }
            });
        }
    }

    /**
     * 展开示例软件列表
     */
    function expandExampleList() {
        var toggleBtn = document.getElementById('exampleToggle');
        var exampleItems = document.getElementById('exampleItems');
        if (toggleBtn && exampleItems) {
            var expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
            if (!expanded) {
                toggleBtn.setAttribute('aria-expanded', 'true');
                exampleItems.classList.add('expanded');
                exampleItems.style.maxHeight = exampleItems.scrollHeight + 'px';
            }
        }
    }

    /**
     * 处理 hash 导航
     * #eg: 定位并展开示例软件列表
     */
    function handleHashNavigation() {
        var hash = window.location.hash;
        if (hash === '#eg') {
            expandExampleList();
            // 等待展开动画完成后再滚动，确保目标位置准确
            setTimeout(function() {
                var target = document.getElementById('eg');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }

    /**
     * 解析 URL 查询参数并执行对应操作
     * plat: GC（游戏中心）或 AM（应用市场），默认 GC
     * pkg: 包名，若有值则填入输入框
     * go: true（默认）自动跳转，false 仅填入不跳转
     * eg: 搜索关键词，填入示例搜索框并展开定位
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
        // go 不存在或 go=true 时自动跳转，go=false 仅填入
        var go = params.get('go');
        autoRedirect = (go !== 'false');

        if (pkg) {
            pkgInput.value = pkg;
            if (autoRedirect) {
                handleSubmit();
            }
        }

        // eg 参数在 loadExamplePackages 的 XHR 回调中处理（需要数据就绪后才能过滤）
    }

    /**
     * 导航到示例软件区域：填入搜索词、展开列表、滚动定位
     * @param {string} keyword - 搜索关键词
     */
    function navigateToExamples(keyword) {
        var exampleSearch = document.getElementById('exampleSearch');
        var searchClear = document.getElementById('searchClear');
        if (exampleSearch) {
            exampleSearch.value = keyword;
            filterExampleItems(keyword);
            if (searchClear) {
                searchClear.hidden = !keyword.trim();
            }
        }
        expandExampleList();
        setTimeout(function() {
            var target = document.getElementById('eg');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }

    // 初始化应用
    function init() {
        initEventListeners();
        loadExamplePackages();
        handleUrlParams();
        // 监听 hash 变化（页面内导航时）
        window.addEventListener('hashchange', handleHashNavigation);
        // 仅在无 pkg/eg 参数时聚焦输入框（避免跳转干扰）
        var params = new URLSearchParams(window.location.search);
        if (!params.get('pkg') && !params.get('eg')) {
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
