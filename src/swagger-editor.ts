import SwaggerEditorBundle from 'swagger-editor'
import SpecListener from './utils/spec-listener'

import Vue from 'vue'
import SaveAndGoBackButton from "@/components/SaveAndGoBackButton.vue";
// @ts-ignore
import './assets/tailwind.css'

import '@/components/Debug/DebugMounter.ts'
import Example from '@/model/OpenApi/OpenApiExample'
import globals from '@/model/globals';
import AP from "@/model/AP";
import {DiagramType} from "@/model/Diagram";
import defaultCompositeContentProvider from "@/model/ContentProvider/CompositeContentProvider";

new Vue({
  render: h => h(SaveAndGoBackButton, {
    props: {
      saveAndExit: async function () {
        // @ts-ignore
        await globals.macro.save({title: '', code: window.specContent, styles: '', mermaidCode: '', diagramType: DiagramType.OpenAPI, source: 'CustomContent'});

        /* eslint-disable no-undef */
        AP.dialog.close();
      }
    },
  })
}).$mount('#save-and-go-back');

async function initializeMacro() {
  const apWrapper = globals.apWrapper;
  await apWrapper.initializeContext();

  const compositeContentProvider = defaultCompositeContentProvider();
  const {content} = await compositeContentProvider.load();
  console.log('-------------- loaded spec:', content?.code)
    // eslint-disable-next-line
    // @ts-ignore
    window.updateSpec(content?.code || Example);
    console.log('-------------- updateSpec with:', content?.code)
}


// eslint-disable-next-line
// @ts-ignore
window.SwaggerEditorBundle = SwaggerEditorBundle;

window.onload = function () {
  // Build a system
  const editor = SwaggerEditorBundle({
    dom_id: '#swagger-editor',
    // layout: 'StandaloneLayout',
    presets: [
      // SwaggerEditorStandalonePreset
    ],
    plugins: [SpecListener],
    // url: 'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/uspto.json'
  })

  // eslint-disable-next-line
  // @ts-ignore
  window.editor = editor


  initializeMacro();
}