import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoalWidget, { EmptyGoalWidget } from './GoalWidget';
import GastoWidget from './GastoWidget';

const WIDGET_STORAGE_KEY = 'GoalWidget:data';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_UPDATE' || props.widgetAction === 'WIDGET_RESIZED') {
    // Nombres = clases nativas en android/app/src/main/java/com/varo_frontend/widget/.
    if (props.widgetInfo.widgetName === 'GastoWidget') {
      props.renderWidget(<GastoWidget />);
      return;
    }
    const json = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
    if (json) {
      const data = JSON.parse(json);
      props.renderWidget(<GoalWidget data={data} />);
    } else {
      props.renderWidget(<EmptyGoalWidget />);
    }
  }
}
