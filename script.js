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

    // 筛选器状态
    var filterEnabled = false;  // 筛选器是否启用（由 toggle 开关状态控制：filterEnabled = filterActive）
    var filterActive = false;   // 筛选开关是否打开（面板内的 toggle，默认关闭）

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
        xhr.timeout = 10000;
        xhr.onload = function() {
            if (xhr.status === 200 && xhr.responseXML) {
                var packages = xhr.responseXML.querySelectorAll('package');
                parseAndValidatePackages(packages);
            } else if (xhr.status === 200 && !xhr.responseXML) {
                showExampleError([{
                    type: 'load',
                    message: 'packages.xml 格式错误，无法解析'
                }]);
            } else {
                showExampleError([{
                    type: 'load',
                    message: '无法加载示例包名列表（HTTP ' + xhr.status + '）'
                }]);
            }
        };
        xhr.onerror = function() {
            showExampleError([{
                type: 'load',
                message: '网络错误，无法加载示例包名列表'
            }]);
        };
        xhr.ontimeout = function() {
            showExampleError([{
                type: 'load',
                message: '加载超时，无法加载示例包名列表'
            }]);
        };
        xhr.send();
    }

    /**
     * 解析并校验包名数据
     * @param {NodeList} packageNodes - XML 中的 package 节点列表
     */
    function parseAndValidatePackages(packageNodes) {
        var warnings = [];
        var duplicateIds = [];
        var idMap = {};
        var validItems = [];

        // 空列表检查
        if (packageNodes.length === 0) {
            showExampleError([{
                type: 'empty',
                message: '示例包名列表为空'
            }]);
            return;
        }

        packageNodes.forEach(function(pkg) {
            var id = pkg.getAttribute('id');
            var nameEl = pkg.querySelector('name');
            var pkgEl = pkg.querySelector('pkg');
            var noteEl = pkg.querySelector('note');
            var type = pkg.getAttribute('type') || '';
            var platform = pkg.getAttribute('platform') || '';

            // 必填字段检查
            if (!nameEl || !nameEl.textContent.trim() || !pkgEl || !pkgEl.textContent.trim()) {
                warnings.push('条目缺少必填字段（name 或 pkg），已跳过：id=' + (id || '(无)'));
                return;
            }

            // ID 有效性检查
            if (!id || !/^\d+$/.test(id) || parseInt(id) <= 0) {
                warnings.push({
                    type: 'invalid-id',
                    message: '条目 id 非法（需为正整数）：' + nameEl.textContent.trim() + '（id=' + (id || '(无)') + '）',
                    canIgnore: true
                });
                return;
            }

            // 重复 ID 记录
            if (idMap[id]) {
                idMap[id].count++;
                idMap[id].names.push(nameEl.textContent.trim());
            } else {
                idMap[id] = { count: 1, names: [nameEl.textContent.trim()] };
            }

            validItems.push({
                id: id,
                type: type,
                platform: platform,
                name: nameEl.textContent.trim(),
                pkg: pkgEl.textContent.trim(),
                note: noteEl ? noteEl.textContent.trim() : ''
            });
        });

        // 检查重复 ID
        for (var id in idMap) {
            if (idMap[id].count > 1) {
                duplicateIds.push({ id: id, names: idMap[id].names });
            }
        }

        // 解析后列表为空
        if (validItems.length === 0) {
            var allErrors = warnings.map(function(msg) {
                return { type: 'warning', message: msg };
            });
            allErrors.push({ type: 'empty', message: '解析后示例包名列表为空（所有条目均无效）' });
            showExampleError(allErrors);
            return;
        }

        // 构建错误列表
        var errors = [];
        var hasBlocking = false;

        warnings.forEach(function(w) {
            if (typeof w === 'string') {
                // 普通警告（缺字段等），自动跳过并加载
                errors.push({ type: 'warning', message: w });
            } else {
                // 可忽略的阻塞错误（非法 id 等）
                errors.push(w);
                if (w.canIgnore) {
                    hasBlocking = true;
                }
            }
        });

        if (duplicateIds.length > 0) {
            var dupMsg = duplicateIds.map(function(dup) {
                return 'id=' + dup.id + '（' + dup.names.join('、') + '）';
            }).join('、');
            errors.push({
                type: 'duplicate-id',
                message: '存在重复 id：' + dupMsg,
                canIgnore: true
            });
            hasBlocking = true;
        }

        if (errors.length > 0) {
            showExampleError(errors, validItems, !hasBlocking);
        } else {
            clearExampleError();
            examplePackages = validItems;
            proceedAfterLoad();
        }
    }

    /**
     * 数据校验通过后的后续流程
     */
    function proceedAfterLoad() {
        renderExampleItems();
        // 数据加载完成后，处理 #eg hash 或 eg 查询参数
        var params = new URLSearchParams(window.location.search);
        var filterParam = params.get('filter') === 'true';
        var egParam = params.get('eg');
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

        // filter=true 时展开筛选器面板（需要列表已展开才能看到）
        if (filterParam) {
            var toggleBtnEl = document.getElementById('exampleToggle');
            if (toggleBtnEl && toggleBtnEl.getAttribute('aria-expanded') === 'true') {
                var filterPanel = document.getElementById('exampleFilterPanel');
                if (filterPanel) filterPanel.hidden = false;
            }
        }
    }

    /**
     * 显示示例区域错误提示
     * @param {Array} errors - 错误列表 [{ type, message, canIgnore? }]
     * @param {Array} [validItems] - 校验通过的数据（点击后加载）
     * @param {boolean} [autoLoad] - 是否自动加载列表（无阻塞错误时）
     */
    function showExampleError(errors, validItems, autoLoad) {
        var container = document.getElementById('exampleError');
        if (!container) return;

        container.innerHTML = '';
        container.hidden = false;

        errors.forEach(function(error) {
            var msg = document.createElement('div');
            msg.className = 'example-error-msg';
            msg.textContent = error.message;
            container.appendChild(msg);
        });

        // 可忽略错误添加按钮
        var hasIgnore = errors.some(function(e) { return e.canIgnore; });
        if (hasIgnore) {
            var btn = document.createElement('button');
            btn.className = 'example-error-btn';
            btn.type = 'button';
            btn.textContent = '加载列表';
            btn.addEventListener('click', function() {
                // 隐藏按钮，保留提示
                btn.hidden = true;
                if (validItems && validItems.length > 0) {
                    examplePackages = validItems;
                    renderExampleItems();
                    // 列表已展开，更新 maxHeight 适配新内容
                    var exampleItems = document.getElementById('exampleItems');
                    if (exampleItems && exampleItems.classList.contains('expanded')) {
                        exampleItems.style.maxHeight = exampleItems.scrollHeight + 'px';
                    }
                    // 处理 hash/eg 参数
                    var egParam = new URLSearchParams(window.location.search).get('eg');
                    if (egParam && egParam.trim()) {
                        navigateToExamples(egParam.trim());
                    } else if (window.location.hash === '#eg') {
                        setTimeout(function() {
                            var target = document.getElementById('eg');
                            if (target) {
                                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }, 100);
                    }
                }
            });
            container.appendChild(btn);
        }

        // 无阻塞错误时同时加载列表
        if (autoLoad && validItems) {
            examplePackages = validItems;
            proceedAfterLoad();
        }
    }

    /**
     * 清除示例区域错误提示
     */
    function clearExampleError() {
        var container = document.getElementById('exampleError');
        if (container) {
            container.innerHTML = '';
            container.hidden = true;
        }
    }

    /**
     * 根据 Packages 数据渲染示例按钮
     */
    function renderExampleItems() {
        var container = document.getElementById('exampleItems');
        if (!container) return;

        container.innerHTML = '';
        // 按 id 数值升序排序
        examplePackages.sort(function(a, b) { return parseInt(a.id) - parseInt(b.id); });
        examplePackages.forEach(function(item) {
            var btn = document.createElement('button');
            btn.className = 'example-chip';
            btn.type = 'button';
            btn.setAttribute('data-pkg', item.pkg);
            btn.setAttribute('data-type', item.type || '');
            btn.setAttribute('data-platform', item.platform || '');
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
     * 判断应用是否属于"通用应用"分类
     * universal = platform="universal" / 未声明 platform / platform 为非 phone/tablet 的其它值
     * @returns {boolean}
     */
    function isUniversal(type, platform) {
        if (platform === 'universal') return true;
        if (platform === 'phone' || platform === 'tablet') return false;
        // 未声明 platform 视为通用
        return true;
    }

    /**
     * 判断应用是否属于"其它应用"分类
     * other = 显式无 type 且属于通用平台（即没有 honor/huawei 标记的非 phone/tablet 应用）
     * 与 universal 互斥：未声明 platform 的应用归为 universal 而非 other
     * @returns {boolean}
     */
    function isOther(type, platform) {
        if (type) return false; // 有 type 标记的（honor/huawei）不属于 other
        if (platform === 'phone' || platform === 'tablet') return false;
        // platform 为 universal / 未声明 / 其它非 phone/tablet 值都不归 other
        return false;
    }

    /**
     * 根据搜索关键词过滤示例按钮显示
     * 搜索在分类筛选结果基础上进一步过滤
     * @param {string} keyword - 搜索关键词
     */
    function filterExampleItems(keyword) {
        var container = document.getElementById('exampleItems');
        if (!container) return;

        var chips = container.querySelectorAll('.example-chip');
        var lowerKeyword = keyword.toLowerCase().trim();

        chips.forEach(function(chip) {
            // 先按分类筛选判断（未启用或开关关闭时不筛选）
            var type = chip.getAttribute('data-type') || '';
            var platform = chip.getAttribute('data-platform') || '';
            var categoryVisible = true;

            if (filterEnabled && filterActive) {
                var selectedCategories = {};
                var labels = document.querySelectorAll('#filterCheckboxRow .filter-checkbox');
                labels.forEach(function(label) {
                    var cb = label.querySelector('input[type="checkbox"]');
                    if (cb && cb.checked) {
                        selectedCategories[label.getAttribute('data-category')] = true;
                    }
                });

                // AND 逻辑：应用若属于被取消勾选的分类则隐藏
                categoryVisible = true;
                if (type === 'honor' && !selectedCategories['honor']) categoryVisible = false;
                if (platform === 'tablet' && !selectedCategories['tablet']) categoryVisible = false;
                if (platform === 'phone' && !selectedCategories['phone']) categoryVisible = false;
                if (type === 'huawei' && !selectedCategories['huawei']) categoryVisible = false;
                if (isUniversal(type, platform) && !selectedCategories['universal']) categoryVisible = false;
                if (isOther(type, platform) && !selectedCategories['other']) categoryVisible = false;
            }

            // 再按搜索关键词判断
            var name = chip.querySelector('span').textContent.toLowerCase();
            var pkg = chip.getAttribute('data-pkg').toLowerCase();
            var note = (chip.getAttribute('title') || '').toLowerCase();

            var searchVisible = !lowerKeyword ||
                name.includes(lowerKeyword) ||
                pkg.includes(lowerKeyword) ||
                note.includes(lowerKeyword);

            chip.style.display = (categoryVisible && searchVisible) ? '' : 'none';
        });
    }

    /**
     * 根据筛选条件过滤示例按钮
     * 筛选器未启用或开关关闭时显示全部
     */
    function applyCategoryFilter() {
        var container = document.getElementById('exampleItems');
        if (!container) return;

        var chips = container.querySelectorAll('.example-chip');

        if (!filterEnabled || !filterActive) {
            // 筛选器未启用或开关关闭，显示全部
            chips.forEach(function(chip) { chip.style.display = ''; });
            return;
        }

        // 获取选中的分类
        var selectedCategories = {};
        var labels = document.querySelectorAll('#filterCheckboxRow .filter-checkbox');
        labels.forEach(function(label) {
            var cb = label.querySelector('input[type="checkbox"]');
            if (cb && cb.checked) {
                selectedCategories[label.getAttribute('data-category')] = true;
            }
        });

        chips.forEach(function(chip) {
            var type = chip.getAttribute('data-type') || '';
            var platform = chip.getAttribute('data-platform') || '';
            // AND 逻辑：应用若属于被取消勾选的分类则隐藏
            var visible = true;
            if (type === 'honor' && !selectedCategories['honor']) visible = false;
            if (platform === 'tablet' && !selectedCategories['tablet']) visible = false;
            if (platform === 'phone' && !selectedCategories['phone']) visible = false;
            if (type === 'huawei' && !selectedCategories['huawei']) visible = false;
            if (isUniversal(type, platform) && !selectedCategories['universal']) visible = false;
            if (isOther(type, platform) && !selectedCategories['other']) visible = false;

            chip.style.display = visible ? '' : 'none';
        });
    }

    /**
     * 更新筛选器面板的 UI 状态
     */
    function updateFilterPanelUI() {
        var panel = document.getElementById('exampleFilterPanel');
        var toggleBtn = document.getElementById('filterToggleBtn');
        if (!panel || !toggleBtn) return;

        toggleBtn.setAttribute('aria-pressed', filterActive ? 'true' : 'false');
        toggleBtn.setAttribute('title', filterActive ? '停用筛选' : '启用筛选');

        if (filterActive) {
            toggleBtn.querySelector('.filter-toggle-icon').innerHTML = '<path d="M280-240q-100 0-170-70T40-480q0-100 70-170t170-70h400q100 0 170 70t70 170q0 100-70 170t-170 70H280Zm0-80h400q66 0 113-47t47-113q0-66-47-113t-113-47H280q-66 0-113 47t-47 113q0 66 47 113t113 47Zm485-75q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-285-85Z"/>';
            panel.classList.remove('filter-disabled');
        } else {
            toggleBtn.querySelector('.filter-toggle-icon').innerHTML = '<path d="M280-240q-100 0-170-70T40-480q0-100 70-170t170-70h400q100 0 170 70t70 170q0 100-70 170t-170 70H280Zm0-80h400q66 0 113-47t47-113q0-66-47-113t-113-47H280q-66 0-113 47t-47 113q0 66 47 113t113 47Zm85-75q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm115-85Z"/>';
            panel.classList.add('filter-disabled');
        }
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

        // 筛选按钮点击事件
        var filterBtn = document.getElementById('exampleFilter');
        var filterPanel = document.getElementById('exampleFilterPanel');
        if (filterBtn && filterPanel) {
            filterBtn.addEventListener('click', function() {
                filterPanel.hidden = !filterPanel.hidden;
            });
        }

        // 筛选器开关按钮
        var filterToggleBtn = document.getElementById('filterToggleBtn');
        if (filterToggleBtn) {
            filterToggleBtn.addEventListener('click', function() {
                filterActive = !filterActive;
                filterEnabled = filterActive;
                updateFilterPanelUI();
                applyCategoryFilter();
            });
        }

        // 筛选器复选框变化事件
        var filterCheckboxRow = document.getElementById('filterCheckboxRow');
        if (filterCheckboxRow) {
            filterCheckboxRow.addEventListener('change', function(e) {
                if (e.target.type === 'checkbox') {
                    applyCategoryFilter();
                    // 更新列表 maxHeight
                    var exampleItemsEl = document.getElementById('exampleItems');
                    if (exampleItemsEl && exampleItemsEl.classList.contains('expanded')) {
                        exampleItemsEl.style.maxHeight = exampleItemsEl.scrollHeight + 'px';
                    }
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
                    // filter=true 时同步展开筛选器面板
                    if (new URLSearchParams(window.location.search).get('filter') === 'true') {
                        var filterPanel = document.getElementById('exampleFilterPanel');
                        if (filterPanel) filterPanel.hidden = false;
                    }
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

        // 解析筛选器开关（select）：控制默认启用/禁用状态
        // 不传 → 保持 JS 初始默认；select=true → 启用；select=false → 禁用
        var select = params.get('select');
        if (select === 'true') {
            filterActive = true;
            filterEnabled = true;
        } else if (select === 'false') {
            filterActive = false;
            filterEnabled = false;
        }
        updateFilterPanelUI();

        // 解析分类勾选：honor/tablet/phone/huawei/other/universal
        // 不传或传 true → 勾选；传 false → 取消勾选
        ['honor', 'tablet', 'phone', 'huawei', 'other', 'universal'].forEach(function(cat) {
            var val = params.get(cat);
            if (val === 'false') {
                var label = document.querySelector('#filterCheckboxRow .filter-checkbox[data-category="' + cat + '"]');
                if (label) {
                    var cb = label.querySelector('input[type="checkbox"]');
                    if (cb) cb.checked = false;
                }
            }
        });
        applyCategoryFilter();

        // eg 参数在 loadExamplePackages 的 XHR 回调中处理（需要数据就绪后才能过滤）
        // filter 参数在 proceedAfterLoad 中处理（需要列表展开后才能看到面板）
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
        updateFilterPanelUI();
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
