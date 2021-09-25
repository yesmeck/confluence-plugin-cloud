import uuidv4 from '../utils/uuid';
import {getUrlParam, trackEvent} from '@/utils/window.ts';
import ApWrapper2 from "./ApWrapper2";
import {IApWrapper} from "@/model/IApWrapper";
import {IContentPropertyNormalised} from "@/model/IContentProperty";
import {ICustomContent} from "@/model/ICustomContent";
import {IMacroData} from "@/model/IMacroData";
import {DataSource, Diagram, DiagramType} from "@/model/Diagram";

class BaseMacro2 {
  _diagram?: Diagram;
  _key: any;
  _customContentId: string | undefined;
  _loaded = false;
  _macroIdentifier: any;
  _pageId: any;
  _standaloneCustomContent: boolean;
  private _apWrapper: IApWrapper;

  constructor(apWrapper2: ApWrapper2) {
    this._apWrapper = apWrapper2;
    this._macroIdentifier = this._apWrapper._macroIdentifier;
    this._standaloneCustomContent = getUrlParam('rendered.for') === 'custom-content-native';
  }

  async initPageId() {
    if(!this._pageId) {
      this._pageId = getUrlParam('content.id') || (await this._apWrapper.getPageId());
    }
  }

  propertyKey(uuid: string) {
    const macroKey = `zenuml-${this._macroIdentifier}-macro`;
    return `${macroKey}-${uuid}-body`;
  }

  async getCustomContent() {
    trackEvent(this._pageId, 'load_macro', 'custom_content');
    if(this._customContentId) {
      return await this._apWrapper.getCustomContentById(this._customContentId);
    }
  }

  async getContentProperty(): Promise<IContentPropertyNormalised | undefined> {
    let content = await this._apWrapper.getContentProperty2();
    if(content?.value.source === DataSource.ContentPropertyOld) {
      trackEvent(this._pageId, 'load_macro', 'content_property_old');
    } else {
      trackEvent(this._pageId, 'load_macro', 'content_property');
    }
    return content;
  }

  async getMacroBody() {
    trackEvent(this._pageId, 'load_macro', 'macro_body');
    return await this._apWrapper.getMacroBody();
  }

  async getContent(): Promise<IContentPropertyNormalised | ICustomContent | undefined> {
    if(this._standaloneCustomContent) {
      console.debug('rendering for custom content native viewer.');
      // @ts-ignore
      this._customContentId = getUrlParam('content.id');
      console.debug('custom content id:', this._customContentId);
      return await this.getCustomContent();
    }
    const macroData = await this._apWrapper.getMacroData();
    console.debug('macro data loaded:', macroData);

    // When the macro is edited for the first time, macro data is not available in the preview mode
    // Fall back to the uuid parameter in the URL.
    // This is defined in the descriptor and is only available for sequence-viewer.html.
    this._key = macroData?.uuid || getUrlParam('uuid');
    this._customContentId = macroData?.customContentId;
    
    if(this._customContentId) {
      return await this.getCustomContent();
    }
    if(this._key) {
      return await this.getContentProperty();
    }
    return undefined;
  }

  async load(): Promise<Diagram> {
    await this.initPageId();

    let diagram;
    const payload = await this.getContent();

    if(!payload || !payload.value) {
      diagram = {
        diagramType: DiagramType.Sequence,
        code: await this.getMacroBody(),
        source: DataSource.MacroBody
      }
    } else {
      diagram = payload?.value as Diagram;
    }

    this._loaded = true;

    console.debug('Loaded macro', diagram);
    this._diagram = diagram;
    return diagram;
  }

  // Warning! Do not call getXXX in save. Do retest if you want to call getXXX.
  // It does not work as of 17th May 2020. That is why we have stored key and version
  async save(value: Diagram) {
    console.debug('Saving macro', value);
    if (!this._loaded) {
      throw new Error('You have to call load before calling save()')
    }
    const key = this._key || uuidv4();
    let customContent;
    if(this._customContentId) {
      customContent = await this._apWrapper.saveCustomContent(this._customContentId, key, value);
    } else {
      customContent = await this._apWrapper.createCustomContent(key, value);
    }

    trackEvent(this._pageId, 'save_macro', 'custom_content');
    const macroParam = {uuid: key, updatedAt: new Date()} as IMacroData;
    macroParam.customContentId = customContent.id;

    //TODO: Edit issue when editing content property based macro in viewer
    // Saving core data to body for disaster recovery
    let body = BaseMacro2.getCoreData(value);
    this._apWrapper.saveMacro(macroParam, body);
    trackEvent(this._pageId, 'save_macro', 'macro_body');
    return macroParam.customContentId;
  }

  private static getCoreData(value: Diagram) {
    let body;
    switch (value.diagramType) {
      case DiagramType.Sequence:
        body = value.code || '';
        break;
      case DiagramType.Mermaid:
        body = value.mermaidCode || '';
        break;
      case DiagramType.Graph:
        body = value.graphXml || '';
        break;
    }
    return body;
  }
}

export default BaseMacro2