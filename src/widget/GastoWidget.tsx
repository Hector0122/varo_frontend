/* eslint-disable react-native/no-inline-styles -- react-native-android-widget serializa los estilos a RemoteViews */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlexWidget, TextWidget, requestWidgetUpdate } from 'react-native-android-widget';

export const GASTO_WIDGET_KEY = 'GastoWidget:data';

const BG = '#1E1E1E';
const CARD = '#2A2A2A';
const BORDER = '#3A3A3A';
const GREEN = '#22C55E';
const TEXT = '#F5F5F5';

const gastoUri = (categoria?: string) =>
  categoria ? `varo://gasto?categoria=${encodeURIComponent(categoria)}` : 'varo://gasto';

function Boton({ categoria }: { categoria: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: gastoUri(categoria) }}
      style={{
        flex: 1,
        height: 40,
        marginHorizontal: 3,
        borderRadius: 12,
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
      }}
    >
      <TextWidget text={categoria} maxLines={1} truncate="END" style={{ fontSize: 13, color: TEXT }} />
    </FlexWidget>
  );
}

/** Un toque en una categoría abre Varo con el gasto listo: solo falta el monto. */
export default function GastoWidget({ categorias }: { categorias: string[] }) {
  const filas = [categorias.slice(0, 3), categorias.slice(3, 6)].filter(f => f.length);
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        padding: 10,
        borderRadius: 20,
        backgroundColor: BG,
      }}
    >
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: gastoUri() }}
        style={{
          width: 'match_parent',
          height: 40,
          borderRadius: 12,
          marginBottom: 6,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: GREEN,
        }}
      >
        <TextWidget text="+ Gasto" style={{ fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' }} />
      </FlexWidget>
      {filas.map((fila, i) => (
        <FlexWidget key={i} style={{ width: 'match_parent', flexDirection: 'row', marginBottom: 6 }}>
          {fila.map(c => (
            <Boton key={c} categoria={c} />
          ))}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export async function readGastoWidget(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(GASTO_WIDGET_KEY)) ?? '[]');
  } catch {
    return [];
  }
}

/** La app lo llama cuando cambian tus categorías frecuentes. */
export function updateGastoWidget(categorias: string[]) {
  AsyncStorage.setItem(GASTO_WIDGET_KEY, JSON.stringify(categorias)).catch(() => {});
  requestWidgetUpdate({
    widgetName: 'GastoWidget',
    renderWidget: () => <GastoWidget categorias={categorias} />,
  }).catch(() => {});
}
