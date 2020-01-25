/*
 * Copyright (C) 2017 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.ethernom.android.autofill.service.data.source.local.db;


import android.content.Context;

import androidx.annotation.NonNull;
import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import androidx.room.TypeConverters;
import androidx.sqlite.db.SupportSQLiteDatabase;

import com.ethernom.android.autofill.service.data.source.DefaultFieldTypesSource;
import com.ethernom.android.autofill.service.data.source.local.dao.AutofillDao;
import com.ethernom.android.autofill.service.model.AutofillDataset;
import com.ethernom.android.autofill.service.model.AutofillHint;
import com.ethernom.android.autofill.service.model.DefaultFieldTypeWithHints;
import com.ethernom.android.autofill.service.model.FakeData;
import com.ethernom.android.autofill.service.model.FieldType;
import com.ethernom.android.autofill.service.model.FilledAutofillField;
import com.ethernom.android.autofill.service.model.ResourceIdHeuristic;
import com.ethernom.android.autofill.service.util.AppExecutors;

import java.util.ArrayList;
import java.util.List;

import static com.ethernom.android.autofill.service.data.source.local.db.Converters.IntList;
import static java.util.stream.Collectors.toList;

@Database(entities = {
        FilledAutofillField.class,
        AutofillDataset.class,
        FieldType.class,
        AutofillHint.class,
        ResourceIdHeuristic.class
}, version = 1)
@TypeConverters({Converters.class})
public abstract class AutofillDatabase extends RoomDatabase {

    private static final Object sLock = new Object();
    private static AutofillDatabase sInstance;

    public static AutofillDatabase getInstance(Context context,
                                               DefaultFieldTypesSource defaultFieldTypesSource,
                                               AppExecutors appExecutors) {
        if (sInstance == null) {
            synchronized (sLock) {
                if (sInstance == null) {
                    sInstance = Room.databaseBuilder(context.getApplicationContext(),
                            AutofillDatabase.class, "AutofillSample.db")
                            .addCallback(new RoomDatabase.Callback() {
                                @Override
                                public void onCreate(@NonNull SupportSQLiteDatabase db) {
                                    appExecutors.diskIO().execute(() -> {
                                        List<DefaultFieldTypeWithHints> fieldTypes =
                                                defaultFieldTypesSource.getDefaultFieldTypes();
                                        AutofillDatabase autofillDatabase =
                                                getInstance(context, defaultFieldTypesSource,
                                                        appExecutors);
                                        autofillDatabase.saveDefaultFieldTypes(fieldTypes);
                                    });
                                }

                                @Override
                                public void onOpen(@NonNull SupportSQLiteDatabase db) {
                                    super.onOpen(db);
                                }
                            })
                            .build();
                }
            }
        }
        return sInstance;
    }

    private void saveDefaultFieldTypes(List<DefaultFieldTypeWithHints> defaultFieldTypes) {
        List<FieldType> storedFieldTypes = new ArrayList<>();
        List<AutofillHint> storedAutofillHints = new ArrayList<>();
        for (DefaultFieldTypeWithHints defaultType : defaultFieldTypes) {
            DefaultFieldTypeWithHints.DefaultFieldType defaultFieldType = defaultType.fieldType;
            List<String> autofillHints = defaultType.autofillHints;
            IntList autofillTypes = new IntList(defaultFieldType.autofillTypes);
            DefaultFieldTypeWithHints.DefaultFakeData defaultFakeData = defaultType.fieldType.fakeData;
            FakeData fakeData = new FakeData(new Converters.StringList(
                    defaultFakeData.strictExampleSet), defaultFakeData.textTemplate,
                    defaultFakeData.dateTemplate);
            FieldType storedFieldType = new FieldType(defaultFieldType.typeName, autofillTypes,
                    defaultFieldType.saveInfo, defaultFieldType.partition, fakeData);
            storedFieldTypes.add(storedFieldType);
            storedAutofillHints.addAll(autofillHints.stream()
                    .map((autofillHint) -> new AutofillHint(autofillHint,
                            storedFieldType.getTypeName())).collect(toList()));
        }
        AutofillDao autofillDao = autofillDao();
        autofillDao.insertFieldTypes(storedFieldTypes);
        autofillDao.insertAutofillHints(storedAutofillHints);
    }

    public abstract AutofillDao autofillDao();
}