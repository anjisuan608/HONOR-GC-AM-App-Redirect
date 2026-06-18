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
    // 组级筛选开关：type 控制 honor/huawei/other，platform 控制 universal/phone/tablet
    var typeFilterActive = true;     // 应用类型组开关（默认启用）
    var platformFilterActive = true; // 应用平台组开关（默认启用）

    // 类型分类集合：哪些 category 受 type 组开关影响
    var TYPE_CATEGORIES = ['honor', 'huawei', 'other'];
    // 平台分类集合：哪些 category 受 platform 组开关影响
    var PLATFORM_CATEGORIES = ['universal', 'phone', 'tablet'];

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
        // 标记 eg 是否已处理（navigateToExamples 内部已包含 applyCategoryFilter + 搜索过滤）
        var egHandled = false;
        if (egParam && egParam.trim()) {
            navigateToExamples(egParam.trim());
            egHandled = true;
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

        // 数据渲染完成后，重新应用 URL 参数的分类筛选（之前 init 阶段容器为空）
        // 跳过 eg 场景：navigateToExamples 内部已经处理过搜索 + 分类过滤
        if (!egHandled) {
            applyCategoryFilter();
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

        // 警告图标
        var iconWrap = document.createElement('span');
        iconWrap.className = 'example-error-icon';
        iconWrap.setAttribute('aria-hidden', 'true');
        iconWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm330.5-51.5Q520-263 520-280t-11.5-28.5Q497-320 480-320t-28.5 11.5Q440-297 440-280t11.5 28.5Q463-240 480-240t28.5-11.5ZM440-360h80v-200h-80v200Zm40-100Z"/></svg>';
        container.appendChild(iconWrap);

        var contentWrap = document.createElement('div');
        contentWrap.className = 'example-error-content';

        errors.forEach(function(error) {
            var msg = document.createElement('div');
            msg.className = 'example-error-msg';
            msg.textContent = error.message;
            contentWrap.appendChild(msg);
        });

        container.appendChild(contentWrap);
        container.hidden = false;

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
            contentWrap.appendChild(btn);
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
     * other = type 维度兜底：type 缺失、为空、或 type 不是 honor/huawei 的应用都归 other
     * @returns {boolean}
     */
    function isOther(type) {
        return type !== 'honor' && type !== 'huawei';
    }

    /**
     * 判断应用是否属于"手机应用"分类
     * @returns {boolean}
     */
    function isPhone(type, platform) {
        return platform === 'phone';
    }

    /**
     * 判断应用是否属于"平板应用"分类
     * @returns {boolean}
     */
    function isTablet(type, platform) {
        return platform === 'tablet';
    }

    /**
     * 根据搜索关键词过滤示例按钮显示
     * 先应用分类筛选（applyCategoryFilter），再叠加搜索过滤
     * @param {string} keyword - 搜索关键词
     */
    function filterExampleItems(keyword) {
        var container = document.getElementById('exampleItems');
        if (!container) return;

        // 先应用分类筛选
        applyCategoryFilter();

        // 再叠加搜索过滤
        var lowerKeyword = keyword.toLowerCase().trim();
        if (!lowerKeyword) {
            updateEmptyHint();
            return;  // 无搜索词，分类筛选已处理完毕
        }

        var chips = container.querySelectorAll('.example-chip');
        chips.forEach(function(chip) {
            if (chip.style.display === 'none') return;  // 已被分类筛掉

            var name = chip.querySelector('span').textContent.toLowerCase();
            var pkg = chip.getAttribute('data-pkg').toLowerCase();
            var note = (chip.getAttribute('title') || '').toLowerCase();

            var searchVisible = name.includes(lowerKeyword) ||
                                pkg.includes(lowerKeyword) ||
                                note.includes(lowerKeyword);
            if (!searchVisible) chip.style.display = 'none';
        });
        updateEmptyHint();
    }

    /**
     * 根据当前可见 chip 数量控制"没有找到匹配的结果"提示的显隐
     * 仅在列表展开时才有意义（CSS 控制）
     */
    function updateEmptyHint() {
        var container = document.getElementById('exampleItems');
        var hint = document.getElementById('exampleEmpty');
        if (!container || !hint) return;
        var chips = container.querySelectorAll('.example-chip');
        var hasVisible = false;
        for (var i = 0; i < chips.length; i++) {
            if (chips[i].style.display !== 'none') {
                hasVisible = true;
                break;
            }
        }
        hint.hidden = hasVisible;
    }

    /**
     * 应用当前过滤状态（分类 + 搜索），供筛选器变化等场景调用
     */
    function applyCurrentFilter() {
        var exampleSearch = document.getElementById('exampleSearch');
        var keyword = exampleSearch ? exampleSearch.value : '';
        filterExampleItems(keyword);
        // 重新计算列表 maxHeight（筛选条件变化可能改变可见 chip 数量）
        var exampleItemsEl = document.getElementById('exampleItems');
        if (exampleItemsEl && exampleItemsEl.classList.contains('expanded')) {
            exampleItemsEl.style.maxHeight = exampleItemsEl.scrollHeight + 'px';
        }
    }

    /**
     * 根据筛选条件过滤示例按钮
     * 筛选器未启用或开关关闭时显示全部
     */
    function applyCategoryFilter() {
        var container = document.getElementById('exampleItems');
        if (!container) return;

        var chips = container.querySelectorAll('.example-chip');

        if (!filterActive) {
            // 顶层筛选器未启用或开关关闭，显示全部
            chips.forEach(function(chip) { chip.style.display = ''; });
            return;
        }
        if (!typeFilterActive && !platformFilterActive) {
            // 两个组开关都关闭，等价于关闭筛选器，显示全部
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
            // type 组：组开关关闭时跳过该组所有判断（不参与过滤）
            if (typeFilterActive) {
                if (type === 'honor' && !selectedCategories['honor']) visible = false;
                if (type === 'huawei' && !selectedCategories['huawei']) visible = false;
                if (isOther(type) && !selectedCategories['other']) visible = false;
            }
            // platform 组：组开关关闭时跳过该组所有判断（不参与过滤）
            if (platformFilterActive) {
                if (platform === 'tablet' && !selectedCategories['tablet']) visible = false;
                if (platform === 'phone' && !selectedCategories['phone']) visible = false;
                if (isUniversal(type, platform) && !selectedCategories['universal']) visible = false;
            }

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

        // 更新组开关的 UI
        var typeToggle = document.querySelector('[data-group-toggle="type"]');
        var platformToggle = document.querySelector('[data-group-toggle="platform"]');
        if (typeToggle) {
            typeToggle.setAttribute('aria-pressed', typeFilterActive ? 'true' : 'false');
            typeToggle.setAttribute('title', typeFilterActive ? '停用应用类型筛选' : '启用应用类型筛选');
            if (typeFilterActive) {
                typeToggle.querySelector('.filter-toggle-icon').innerHTML = '<path d="M280-240q-100 0-170-70T40-480q0-100 70-170t170-70h400q100 0 170 70t70 170q0 100-70 170t-170 70H280Zm0-80h400q66 0 113-47t47-113q0-66-47-113t-113-47H280q-66 0-113 47t-47 113q0 66 47 113t113 47Zm485-75q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-285-85Z"/>';
            } else {
                typeToggle.querySelector('.filter-toggle-icon').innerHTML = '<path d="M280-240q-100 0-170-70T40-480q0-100 70-170t170-70h400q100 0 170 70t70 170q0 100-70 170t-170 70H280Zm0-80h400q66 0 113-47t47-113q0-66-47-113t-113-47H280q-66 0-113 47t-47 113q0 66 47 113t113 47Zm85-75q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm115-85Z"/>';
            }
        }
        if (platformToggle) {
            platformToggle.setAttribute('aria-pressed', platformFilterActive ? 'true' : 'false');
            platformToggle.setAttribute('title', platformFilterActive ? '停用应用平台筛选' : '启用应用平台筛选');
            if (platformFilterActive) {
                platformToggle.querySelector('.filter-toggle-icon').innerHTML = '<path d="M280-240q-100 0-170-70T40-480q0-100 70-170t170-70h400q100 0 170 70t70 170q0 100-70 170t-170 70H280Zm0-80h400q66 0 113-47t47-113q0-66-47-113t-113-47H280q-66 0-113 47t-47 113q0 66 47 113t113 47Zm485-75q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-285-85Z"/>';
            } else {
                platformToggle.querySelector('.filter-toggle-icon').innerHTML = '<path d="M280-240q-100 0-170-70T40-480q0-100 70-170t170-70h400q100 0 170 70t70 170q0 100-70 170t-170 70H280Zm0-80h400q66 0 113-47t47-113q0-66-47-113t-113-47H280q-66 0-113 47t-47 113q0 66 47 113t113 47Zm85-75q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm115-85Z"/>';
            }
        }
        // 组上的 data-disabled 控制 chips 半透明（与组开关联动）
        var typeGroup = document.querySelector('.filter-group[data-group="type"]');
        var platformGroup = document.querySelector('.filter-group[data-group="platform"]');
        if (typeGroup) typeGroup.setAttribute('data-disabled', typeFilterActive ? 'false' : 'true');
        if (platformGroup) platformGroup.setAttribute('data-disabled', platformFilterActive ? 'false' : 'true');
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
                // 更新列表 maxHeight
                var exampleItemsEl = document.getElementById('exampleItems');
                if (exampleItemsEl && exampleItemsEl.classList.contains('expanded')) {
                    exampleItemsEl.style.maxHeight = exampleItemsEl.scrollHeight + 'px';
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
                    // 更新列表 maxHeight
                    var exampleItemsEl = document.getElementById('exampleItems');
                    if (exampleItemsEl && exampleItemsEl.classList.contains('expanded')) {
                        exampleItemsEl.style.maxHeight = exampleItemsEl.scrollHeight + 'px';
                    }
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
                applyCurrentFilter();
            });
        }

        // 组级筛选开关按钮
        var groupToggles = document.querySelectorAll('[data-group-toggle]');
        groupToggles.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var group = btn.getAttribute('data-group-toggle');
                if (group === 'type') {
                    typeFilterActive = !typeFilterActive;
                } else if (group === 'platform') {
                    platformFilterActive = !platformFilterActive;
                }
                updateFilterPanelUI();
                applyCurrentFilter();
            });
        });

        // 筛选器复选框变化事件
        var filterCheckboxRow = document.getElementById('filterCheckboxRow');
        if (filterCheckboxRow) {
            filterCheckboxRow.addEventListener('change', function(e) {
                if (e.target.type === 'checkbox') {
                    applyCurrentFilter();
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
                    // 展开时如果内容超出 CSS max-height 上限（60vh），不强制覆盖为 scrollHeight，让 CSS 上限生效并出现滚动条
                    var maxAllowed = exampleItems.scrollHeight;
                    exampleItems.style.maxHeight = '';  // 让 CSS .expanded 的 max-height: 60vh 生效
                    // 如果实际内容小于 60vh，使用精确高度（避免列表看起来空荡）
                    if (maxAllowed < exampleItems.clientHeight) {
                        exampleItems.style.maxHeight = maxAllowed + 'px';
                    }
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
                // 让 CSS .expanded 的 max-height: 60vh 生效；内容少时收回到精确高度
                exampleItems.style.maxHeight = '';
                var maxAllowed = exampleItems.scrollHeight;
                if (maxAllowed < exampleItems.clientHeight) {
                    exampleItems.style.maxHeight = maxAllowed + 'px';
                }
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
        var ignoredParams = [];  // 收集被忽略的非法参数

        // 检测未定义的参数（白名单外的任何参数名）
        var allowedParams = ['plat', 'pkg', 'go', 'eg', 'filter', 'select', 'platform', 'type',
                             'honor', 'huawei', 'other', 'universal', 'phone', 'tablet'];
        var unknownCount = 0;
        params.forEach(function(value, key) {
            if (allowedParams.indexOf(key) === -1) {
                unknownCount++;
            }
        });
        if (unknownCount > 0) {
            ignoredParams.push({
                name: '',
                value: '',
                reason: '使用了' + unknownCount + '个不受支持的参数',
                hideName: true
            });
        }

        // 解析平台参数
        var platRaw = params.get('plat');
        var plat = (platRaw || '').toUpperCase();
        if (platRaw !== null && platRaw !== '' && plat !== 'AM' && plat !== 'GC') {
            ignoredParams.push({ name: 'plat', value: platRaw, reason: '仅支持 GC（游戏中心）或 AM（应用市场）' });
        }
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
        if (go !== null && go !== '' && go !== 'true' && go !== 'false') {
            ignoredParams.push({ name: 'go', value: go, reason: '仅支持 true（自动跳转）或 false（仅填入）' });
        }
        autoRedirect = (go !== 'false');

        if (pkg) {
            pkgInput.value = pkg;
            if (autoRedirect) {
                handleSubmit();
            }
        }

        // 检测 filter 参数合法性（仅在 proceedAfterLoad 中实际生效）
        var filterParam = params.get('filter');
        if (filterParam !== null && filterParam !== '' && filterParam !== 'true' && filterParam !== 'false') {
            ignoredParams.push({ name: 'filter', value: filterParam, reason: '仅支持 true（列表已展开时自动展开筛选器）' });
        }

        // 解析筛选器开关（select）：控制默认启用/禁用状态
        // 不传 → 保持 JS 初始默认；select=true → 启用；select=false → 禁用
        var select = params.get('select');
        if (select !== null && select !== '' && select !== 'true' && select !== 'false') {
            ignoredParams.push({ name: 'select', value: select, reason: '仅支持 true 或 false' });
        }
        if (select === 'true') {
            filterActive = true;
            filterEnabled = true;
        } else if (select === 'false') {
            filterActive = false;
            filterEnabled = false;
        }
        updateFilterPanelUI();

        // 解析组级筛选开关：platform / type
        // 不传或传 true → 保持默认（启用）；传 false → 关闭
        var platformParam = params.get('platform');
        if (platformParam !== null && platformParam !== '' && platformParam !== 'true' && platformParam !== 'false') {
            ignoredParams.push({ name: 'platform', value: platformParam, reason: '仅支持 true 或 false' });
        }
        if (platformParam === 'false') {
            platformFilterActive = false;
        } else if (platformParam === 'true') {
            platformFilterActive = true;
        }
        var typeParam = params.get('type');
        if (typeParam !== null && typeParam !== '' && typeParam !== 'true' && typeParam !== 'false') {
            ignoredParams.push({ name: 'type', value: typeParam, reason: '仅支持 true 或 false' });
        }
        if (typeParam === 'false') {
            typeFilterActive = false;
        } else if (typeParam === 'true') {
            typeFilterActive = true;
        }
        updateFilterPanelUI();

        // 解析分类勾选：honor/tablet/phone/huawei/other/universal
        // 不传 → 保持当前；传 true → 勾选；传 false → 取消勾选
        ['honor', 'tablet', 'phone', 'huawei', 'other', 'universal'].forEach(function(cat) {
            var val = params.get(cat);
            if (val !== null && val !== '' && val !== 'true' && val !== 'false') {
                ignoredParams.push({ name: cat, value: val, reason: '仅支持 true 或 false' });
                return;
            }
            if (val === 'true' || val === 'false') {
                var label = document.querySelector('#filterCheckboxRow .filter-checkbox[data-category="' + cat + '"]');
                if (label) {
                    var cb = label.querySelector('input[type="checkbox"]');
                    if (cb) cb.checked = (val === 'true');
                }
            }
        });
        applyCategoryFilter();

        // 渲染被忽略参数的警告
        renderUrlParamWarning(ignoredParams);

        // eg 参数在 loadExamplePackages 的 XHR 回调中处理（需要数据就绪后才能过滤）
        // filter 参数在 proceedAfterLoad 中处理（需要列表展开后才能看到面板）
    }

    /**
     * 渲染 URL 参数警告提示
     * @param {Array} ignoredParams - 被忽略的参数列表 [{name, value, reason, hideName?}]
     */
    function renderUrlParamWarning(ignoredParams) {
        var container = document.getElementById('urlParamWarning');
        var list = document.getElementById('urlParamWarningList');
        if (!container || !list) return;

        if (!ignoredParams || ignoredParams.length === 0) {
            container.hidden = true;
            list.innerHTML = '';
            return;
        }

        list.innerHTML = '';
        ignoredParams.forEach(function(item) {
            var li = document.createElement('li');
            // hideName=true 时只显示 reason，不暴露参数名（如未定义参数）
            li.textContent = item.hideName ? item.reason : (item.name + '：' + item.reason);
            list.appendChild(li);
        });
        container.hidden = false;
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
