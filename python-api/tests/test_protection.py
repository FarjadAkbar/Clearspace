from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from clearspace.protection import SQLiteProtection

def test_atomic_quotas_survive_restart(tmp_path):
    path=tmp_path/'quotas.sqlite3';store=SQLiteProtection(path)
    with ThreadPoolExecutor(max_workers=8) as pool:
        counts=list(pool.map(lambda _:store._increment('same-user',60)[0],range(40)))
    assert sorted(counts)==list(range(1,41))
    assert SQLiteProtection(path)._increment('same-user',60)[0]==41

def test_owner_checked_leases(tmp_path):
    store=SQLiteProtection(tmp_path/'quotas.sqlite3')
    assert store._acquire('busy','owner-a',55)
    assert not store._acquire('busy','owner-b',55)
    store._release('busy','owner-b')
    assert not store._acquire('busy','owner-b',55)
    store._release('busy','owner-a');assert store._acquire('busy','owner-b',55)

def test_expired_counters_and_leases_reset(tmp_path,monkeypatch):
    store=SQLiteProtection(tmp_path/'quotas.sqlite3')
    monkeypatch.setattr('clearspace.protection.time.time',lambda:100)
    assert store._increment('key',60)[0]==1
    assert store._acquire('busy','a',30)
    monkeypatch.setattr('clearspace.protection.time.time',lambda:161)
    assert store._increment('key',60)[0]==1
    assert store._acquire('busy','b',30)
