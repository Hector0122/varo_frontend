import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import GastoWidget from './GastoWidget';

/** Único widget: botón "+ Gasto" (clase nativa widget/GastoWidget.java). */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_UPDATE' || props.widgetAction === 'WIDGET_RESIZED') {
    props.renderWidget(<GastoWidget />);
  }
}
