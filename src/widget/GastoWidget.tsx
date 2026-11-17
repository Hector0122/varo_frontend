/* eslint-disable react-native/no-inline-styles -- react-native-android-widget serializa los estilos a RemoteViews */
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

/** Un solo botón (2x1): abre Varo en el registro rápido de gasto. */
export default function GastoWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'varo://gasto' }}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#22C55E',
      }}
    >
      <TextWidget text="+ Gasto" style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }} />
    </FlexWidget>
  );
}
