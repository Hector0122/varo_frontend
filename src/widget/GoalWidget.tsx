import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface GoalWidgetData {
  goalName: string;
  estimatedDays: number;
  estimatedDate: string;
}

interface Props {
  data: GoalWidgetData;
}

export default function GoalWidget({ data }: Props) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
      }}
    >
      <TextWidget
        text={data.goalName}
        maxLines={1}
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: '#ffffff',
        }}
      />
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          marginTop: 8,
        }}
      >
        <TextWidget
          text={`${data.estimatedDays}`}
          style={{
            fontSize: 36,
            fontWeight: 'bold',
            color: '#f9a825',
          }}
        />
        <TextWidget
          text=" días"
          style={{
            fontSize: 14,
            color: '#a0a0a0',
            marginLeft: 4,
          }}
        />
      </FlexWidget>
      <TextWidget
        text={data.estimatedDate}
        style={{
          fontSize: 12,
          color: '#a0a0a0',
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}
