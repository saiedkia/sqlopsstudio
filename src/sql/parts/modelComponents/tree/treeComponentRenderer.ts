/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';
import 'vs/css!sql/media/icons/common-icons';
import * as dom from 'vs/base/browser/dom';
import { localize } from 'vs/nls';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ITree, IRenderer } from 'vs/base/parts/tree/browser/tree';
import { IContextViewService } from 'vs/platform/contextview/browser/contextView';
import { LIGHT } from 'vs/platform/theme/common/themeService';
import { Disposable } from 'vs/base/common/lifecycle';
import { Event, Emitter } from 'vs/base/common/event';
import { ITreeComponentItem } from 'sql/workbench/common/views';
import { IWorkbenchThemeService } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { TreeViewDataProvider } from './treeViewDataProvider';

export enum TreeCheckboxState {
	Intermediate = 0,
	Checked = 1,
	Unchecked = 2
}

export class TreeDataTemplate extends Disposable {
	root: HTMLElement;
	label: HTMLSpanElement;
	icon: HTMLElement;
	private _checkbox: HTMLInputElement;
	model: ITreeComponentItem;
	private _onChange = new Emitter<boolean>();

	public readonly onChange: Event<boolean> = this._onChange.event;

	public set checkbox(input: HTMLInputElement) {
		this._checkbox = input;
		this.handleOnChange(this._checkbox, () => {
			this._onChange.fire(this._checkbox.checked);
			if (this.model && this.model.onCheckedChanged) {
				this.model.onCheckedChanged(this._checkbox.checked);
			}
		});
	}

	public get checkboxState(): TreeCheckboxState {
		if (this._checkbox.indeterminate) {
			return TreeCheckboxState.Intermediate;
		} else {
			return this.checkbox.checked ? TreeCheckboxState.Checked : TreeCheckboxState.Unchecked;
		}
	}

	public set checkboxState(value: TreeCheckboxState) {
		if (this.checkboxState !== value) {
			switch (value) {
				case TreeCheckboxState.Checked:
					this._checkbox.indeterminate = false;
					this._checkbox.checked = true;
					break;
				case TreeCheckboxState.Unchecked:
					this._checkbox.indeterminate = false;
					this._checkbox.checked = false;
					break;
				case TreeCheckboxState.Intermediate:
					this._checkbox.indeterminate = true;
					break;
				default:
					break;
			}
		}
	}

	public get checkbox(): HTMLInputElement {
		return this._checkbox;
	}

	protected handleOnChange(domNode: HTMLElement, listener: (e: Event<void>) => void): void {
		this._register(dom.addDisposableListener(domNode, dom.EventType.CHANGE, listener));
	}
}

/**
 * Renders the tree items.
 * Uses the dom template to render connection groups and connections.
 */
export class TreeComponentRenderer extends Disposable implements IRenderer {

	public static DEFAULT_TEMPLATE = 'DEFAULT_TEMPLATE';
	public static DEFAULT_HEIGHT = 20;


	constructor(
		private _dataProvider: TreeViewDataProvider,
		private themeService: IWorkbenchThemeService,
		public options?: { withCheckbox: boolean }
	) {
		super();
	}

	/**
	 * Returns the element's height in the tree, in pixels.
	 */
	public getHeight(tree: ITree, element: any): number {
		return TreeComponentRenderer.DEFAULT_HEIGHT;
	}

	/**
	 * Returns a template ID for a given element.
	 */
	public getTemplateId(tree: ITree, element: any): string {

		return TreeComponentRenderer.DEFAULT_TEMPLATE;
	}

	/**
	 * Render template in a dom element based on template id
	 */
	public renderTemplate(tree: ITree, templateId: string, container: HTMLElement): any {

		if (templateId === TreeComponentRenderer.DEFAULT_TEMPLATE) {
			const nodeTemplate: TreeDataTemplate = new TreeDataTemplate();
			nodeTemplate.root = dom.append(container, dom.$('.tree-component-node-tile'));
			nodeTemplate.icon = dom.append(nodeTemplate.root, dom.$('div.model-view-tree-node-item-icon'));
			if (this.options && this.options.withCheckbox) {
				let checkboxWrapper = dom.append(nodeTemplate.root, dom.$('div.checkboxWrapper'));
				nodeTemplate.checkbox = dom.append(checkboxWrapper, dom.$<HTMLInputElement>('input.checkbox', { type: 'checkbox' }));
			}

			nodeTemplate.label = dom.append(nodeTemplate.root, dom.$('div.model-view-tree-node-item-label'));
			return nodeTemplate;
		}
	}

	/**
	 * Render a element, given an object bag returned by the template
	 */
	public renderElement(tree: ITree, element: ITreeComponentItem, templateId: string, templateData: TreeDataTemplate): void {
		const icon = this.themeService.getTheme().type === LIGHT ? element.icon : element.iconDark;
		templateData.icon.style.backgroundImage = icon ? `url('${icon}')` : '';
		dom.toggleClass(templateData.icon, 'model-view-tree-node-item-icon', !!icon);
		if (element) {
			element.onCheckedChanged = (checked: boolean) => {
				this._dataProvider.onNodeCheckedChanged(element.handle, checked);
			};
			templateData.model = element;
		}
		if (templateId === TreeComponentRenderer.DEFAULT_TEMPLATE) {
			this.renderNode(element, templateData);
		}
	}

	private renderNode(treeNode: ITreeComponentItem, templateData: TreeDataTemplate): void {
		let label = treeNode.label;
		templateData.label.textContent = label;
		templateData.root.title = label;
		templateData.checkboxState = this.getCheckboxState(treeNode);
	}

	private getCheckboxState(treeNode: ITreeComponentItem): TreeCheckboxState {
		if (treeNode.checked === undefined) {
			return TreeCheckboxState.Intermediate;
		} else {
			return treeNode.checked ? TreeCheckboxState.Checked : TreeCheckboxState.Unchecked;
		}
	}

	public disposeTemplate(tree: ITree, templateId: string, templateData: any): void {
		this.dispose();
		// no op
	}
}

